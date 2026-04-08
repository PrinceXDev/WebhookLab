import type { Account, NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GithubProvider from "next-auth/providers/github";

/** GitHub user object returned by OAuth (subset used for JWT seeding). */
type GithubOAuthProfile = {
  id: string | number;
  email?: string | null;
  name?: string | null;
  login?: string;
  avatar_url?: string;
};

const parseGithubProfile = (profile: unknown): GithubOAuthProfile | null => {
  if (!profile || typeof profile !== "object" || !("id" in profile)) {
    return null;
  }
  const { id, email, name, login, avatar_url } = profile as GithubOAuthProfile;
  if (typeof id === "string" || typeof id === "number") {
    return { id, email, name, login, avatar_url };
  }
  return null;
};

const seedTokenFromGithubAccount = (
  token: JWT,
  account: Account,
  profile: unknown,
): void => {
  const gh = parseGithubProfile(profile);
  if (!gh) {
    return;
  }

  const { id, email, name, login, avatar_url } = gh;
  const { access_token } = account;
  const githubId = String(id);

  token.id = githubId;
  token.githubId = githubId;
  token.accessToken = access_token;
  token.email = email;
  token.name = name ?? login;
  token.picture = avatar_url;
};

const getEnvVariable = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: getEnvVariable("GITHUB_CLIENT_ID"),
      clientSecret: getEnvVariable("GITHUB_CLIENT_SECRET"),
      profile: ({ id, githubId, name, email, avatar_url }) => {
        return {
          id,
          githubId,
          name,
          email,
          image: avatar_url,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt: ({ token, account, profile }) => {
      if (account) {
        seedTokenFromGithubAccount(token, account, profile);
      }
      return token;
    },
    session: ({ session, token }) => {
      const { user } = session;
      if (user) {
        const { id, githubId, accessToken, email, name, picture } = token;

        Object.assign(user, {
          id,
          githubId,
          accessToken,
          email: email as string,
          name: name as string,
          image: picture as string,
        });
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  debug: process.env.NODE_ENV === "development",
};

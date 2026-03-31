import { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
          githubId: profile.id.toString(),
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Initial sign in - store GitHub data in JWT
      if (account && profile) {
        token.id = profile.id.toString();
        token.githubId = profile.id.toString();
        token.accessToken = account.access_token;
        token.email = profile.email;
        token.name = profile.name || (profile as any).login;
        token.picture = (profile as any).avatar_url;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).githubId = token.githubId;
        (session.user as any).accessToken = token.accessToken;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
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

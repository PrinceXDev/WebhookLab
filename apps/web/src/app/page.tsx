import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SignInButton } from "@/components/auth/sign-in-button";
import { GithubMarkIcon } from "@/components/icons/github-mark";

const HomePage = async () => {
  const session = await getServerSession(authOptions);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold tracking-tight">
            Webhook<span className="text-blue-600">Lab</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The ngrok + Postman hybrid that actually understands webhooks.
            Inspect, replay, and debug webhooks in real-time.
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          {session ? (
            <Link href="/dashboard">
              <Button size="lg" className="text-lg px-8">
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <SignInButton size="lg" className="text-lg px-8">
              <GithubMarkIcon className="mr-2 h-5 w-5" />
              Sign in with GitHub
            </SignInButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;

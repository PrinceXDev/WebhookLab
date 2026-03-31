import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SignInButton } from '@/components/auth/sign-in-button';
import { Github } from 'lucide-react';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
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
            <SignInButton>
              <Button size="lg" className="text-lg px-8">
                <Github className="mr-2 h-5 w-5" />
                Sign in with GitHub
              </Button>
            </SignInButton>
          )}
          <Link href="/docs">
            <Button size="lg" variant="outline" className="text-lg px-8">
              Documentation
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
            <h3 className="font-semibold text-lg mb-2">⚡ Real-time</h3>
            <p className="text-sm text-muted-foreground">
              Webhooks appear live on your dashboard via WebSocket in under 50ms
            </p>
          </div>
          <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
            <h3 className="font-semibold text-lg mb-2">🔄 Replay</h3>
            <p className="text-sm text-muted-foreground">
              One-click replay of any webhook with full headers and body preservation
            </p>
          </div>
          <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
            <h3 className="font-semibold text-lg mb-2">🤖 AI-Powered</h3>
            <p className="text-sm text-muted-foreground">
              Claude AI analyzes payloads and suggests handler implementations
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

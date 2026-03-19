import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function DashboardNav() {
  return (
    <nav className="border-b bg-white dark:bg-slate-900">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <span className="text-2xl font-bold">
            Webhook<span className="text-blue-600">Lab</span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost">Endpoints</Button>
          </Link>
          <Link href="/dashboard/settings">
            <Button variant="ghost">Settings</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

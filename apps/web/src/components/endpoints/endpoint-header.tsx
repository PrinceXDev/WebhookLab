'use client';

import { Button } from '@/components/ui/button';
import { Copy, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface EndpointHeaderProps {
  slug: string;
}

export function EndpointHeader({ slug }: EndpointHeaderProps) {
  const webhookUrl = `${process.env.NEXT_PUBLIC_API_URL}/hook/${slug}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
  };

  return (
    <div className="mb-8">
      <Link href="/dashboard">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </Link>

      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Endpoint: {slug}</h1>
        
        <div className="flex items-center gap-2 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <code className="flex-1 text-sm font-mono">{webhookUrl}</code>
          <Button size="icon" variant="ghost" onClick={copyToClipboard}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Send webhooks to this URL. Events will appear below in real-time.
        </p>
      </div>
    </div>
  );
}

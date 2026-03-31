'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { SignatureBadge } from './signature-badge';
import { cn } from '@/lib/utils';

interface WebhookEvent {
  id: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  sourceIp: string;
  contentType: string;
  timestamp: number;
  signatureVerification?: {
    provider: string;
    isValid: boolean;
    status: string;
    algorithm?: string;
    message?: string;
  };
}

export function EventCard({ event }: { event: WebhookEvent }) {
  const [expanded, setExpanded] = useState(false);

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-blue-500',
      POST: 'bg-green-500',
      PUT: 'bg-yellow-500',
      PATCH: 'bg-orange-500',
      DELETE: 'bg-red-500',
    };
    return colors[method] || 'bg-gray-500';
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            <Badge className={getMethodColor(event.method)}>{event.method}</Badge>
            <SignatureBadge verification={event.signatureVerification} />
            <span className="text-sm font-mono text-muted-foreground">
              {event.id}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {expanded && (
          <div className="mt-4 space-y-4">
            {event.signatureVerification && event.signatureVerification.status !== 'not_applicable' && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  Signature Verification
                </h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Provider:</span>
                    <span className="font-medium">{event.signatureVerification.provider.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className={cn(
                      'font-medium',
                      event.signatureVerification.isValid ? 'text-green-600' : 'text-red-600'
                    )}>
                      {event.signatureVerification.status.toUpperCase()}
                    </span>
                  </div>
                  {event.signatureVerification.algorithm && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Algorithm:</span>
                      <span className="font-medium">{event.signatureVerification.algorithm}</span>
                    </div>
                  )}
                  {event.signatureVerification.message && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-muted-foreground">{event.signatureVerification.message}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div>
              <h4 className="text-sm font-semibold mb-2">Headers</h4>
              <pre className="text-xs bg-slate-100 dark:bg-slate-900 p-3 rounded overflow-x-auto">
                {JSON.stringify(event.headers, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2">Body</h4>
              <pre className="text-xs bg-slate-100 dark:bg-slate-900 p-3 rounded overflow-x-auto max-h-64 overflow-y-auto">
                {event.body || '(empty)'}
              </pre>
            </div>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span>IP: {event.sourceIp}</span>
              <span>•</span>
              <span>Type: {event.contentType}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

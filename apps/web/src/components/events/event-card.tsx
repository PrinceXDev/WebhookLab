'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface WebhookEvent {
  id: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  sourceIp: string;
  contentType: string;
  timestamp: number;
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
          <div className="flex items-center gap-3 flex-1">
            <Badge className={getMethodColor(event.method)}>{event.method}</Badge>
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

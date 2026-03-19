import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';

interface Endpoint {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const webhookUrl = `${process.env.NEXT_PUBLIC_API_URL}/hook/${endpoint.slug}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
  };

  return (
    <Link href={`/dashboard/endpoints/${endpoint.slug}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-xl">{endpoint.name}</CardTitle>
            <Badge variant={endpoint.isActive ? 'default' : 'secondary'}>
              {endpoint.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <CardDescription>{endpoint.description || 'No description'}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded overflow-hidden text-ellipsis whitespace-nowrap">
                {webhookUrl}
              </code>
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  copyToClipboard();
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Created {new Date(endpoint.createdAt).toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import type { EndpointRecord } from "@/types/endpoint";
import {
  ENDPOINT_STATUS,
  getWebhookUrl,
  NO_DESCRIPTION_TEXT,
} from "@/constants";
import EndpointActions from "./endpoint-actions";

type EndpointCardProps = {
  endpoint: EndpointRecord;
};

const EndpointCard = ({ endpoint }: EndpointCardProps) => {
  const { slug, name, description, isActive, createdAt } = endpoint;
  const webhookUrl = getWebhookUrl(slug);

  const copyToClipboard = () => {
    void navigator.clipboard.writeText(webhookUrl);
  };

  return (
    <Card className="flex flex-col transition-shadow hover:shadow-lg">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Link
              href={`/dashboard/endpoints/${slug}`}
              className="block outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
            >
              <CardTitle className="text-xl hover:underline">{name}</CardTitle>
            </Link>
            <CardDescription className="line-clamp-2">
              {description || NO_DESCRIPTION_TEXT}
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Badge variant={isActive ? "default" : "secondary"}>
              {isActive ? ENDPOINT_STATUS.ACTIVE : ENDPOINT_STATUS.INACTIVE}
            </Badge>
            <EndpointActions endpoint={endpoint} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col space-y-3">
        <div className="flex items-center gap-2">
          <code className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded bg-slate-100 px-3 py-2 font-mono text-xs dark:bg-slate-800">
            {webhookUrl}
          </code>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Copy webhook URL"
            onClick={copyToClipboard}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Created {new Date(createdAt).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
};

export default EndpointCard;

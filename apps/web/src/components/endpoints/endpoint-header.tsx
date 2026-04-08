"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { apiClient } from "@/lib/api-client";
import type { EndpointRecord } from "@/types/endpoint";
import { EndpointActions } from "./endpoint-actions";

const EndpointHeader = ({ slug }: { slug: string }) => {
  const router = useRouter();
  const webhookUrl = webhookUrlForSlug(slug);

  const { data: endpoint } = useQuery({
    queryKey: ["endpoints"],
    queryFn: () => apiClient.get<EndpointRecord[]>("/api/endpoints"),
    select: (endpoints) => endpoints.find((e) => e.slug === slug),
  });

  const { name = "", description = "" } = endpoint ?? {};

  return (
    <div className="mb-8">
      <Link href="/dashboard">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {name ?? "Endpoint"}
            </h1>
            {endpoint ? (
              <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-sm text-muted-foreground">
                {slug}
              </span>
            ) : null}
          </div>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {endpoint ? (
          <EndpointActions
            endpoint={endpoint}
            onDeleted={() => router.push("/dashboard")}
          />
        ) : null}
      </div>

      <WebhookUrlCallout url={webhookUrl} />
    </div>
  );
};

const webhookUrlForSlug = (slug: string) => {
  return `${process.env.NEXT_PUBLIC_API_URL}/hook/${slug}`;
};

const WebhookUrlCallout = ({ url }: { url: string }) => {
  const copyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Webhook URL copied" });
    } catch {
      toast({
        variant: "destructive",
        title: "Could not copy",
        description: "Clipboard access was denied or is unavailable.",
      });
    }
  }, [url]);

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-4 dark:bg-slate-800">
        <code className="flex-1 break-all font-mono text-sm">{url}</code>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Copy webhook URL"
          onClick={() => void copyUrl()}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Send webhooks to this URL. Events appear below in real time. Expand an
        event and use{" "}
        <span className="font-medium text-foreground">AI payload insights</span>{" "}
        to detect the provider, explain the event, and copy a starter handler.
      </p>
    </div>
  );
};

export default EndpointHeader;

"use client";

import type { AiPayloadAnalysis } from "@webhooklab/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Check, Copy, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";

const STEPS = [
  { key: "provider", label: "Provider" },
  { key: "event", label: "Event type" },
  { key: "meaning", label: "What it means" },
  { key: "handler", label: "Handler code" },
] as const;

function confidenceVariant(
  c: AiPayloadAnalysis["providerConfidence"],
): "default" | "secondary" | "outline" {
  if (c === "high") {
    return "default";
  }
  if (c === "medium") {
    return "secondary";
  }
  return "outline";
}

export function PayloadAnalysisPanel({
  endpointSlug,
  eventId,
  analysis,
}: {
  endpointSlug: string;
  eventId: string;
  analysis?: AiPayloadAnalysis;
}) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: async (regenerate: boolean) => {
      return apiClient.post<{ id: string; aiAnalysis?: AiPayloadAnalysis }>(
        `/api/endpoints/${endpointSlug}/events/${eventId}/analyze`,
        { regenerate },
      );
    },
    onSuccess: (_, regenerate) => {
      queryClient.invalidateQueries({ queryKey: ["events", endpointSlug] });
      toast({
        title: regenerate ? "Analysis refreshed" : "Analysis complete",
        description: "Insights are saved on this event.",
      });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description: err instanceof Error ? err.message : "Try again later.",
      });
    },
  });

  const run = (regenerate: boolean) => mutation.mutate(regenerate);

  const active = analysis;
  const pending = mutation.isPending;

  const copyCode = async () => {
    if (!active?.suggestedHandler.code) {
      return;
    }
    await navigator.clipboard.writeText(active.suggestedHandler.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border bg-gradient-to-b from-primary/5 to-transparent p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          <h4 className="text-sm font-semibold">AI payload insights</h4>
        </div>
        <div className="flex flex-wrap gap-2">
          {active ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => run(true)}
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              <span className="ml-1.5">Regenerate</span>
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => run(false)}
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span className="ml-1.5">Analyze payload</span>
            </Button>
          )}
        </div>
      </div>

      <ol
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        aria-label="Analysis flow"
      >
        {STEPS.map((step, i) => {
          const done = Boolean(active) && !pending;
          return (
            <li
              key={step.key}
              className={cn(
                "flex items-center gap-2 rounded-md border px-2 py-2 text-xs",
                done && "border-primary/40 bg-primary/5",
                pending && i === 0 && "animate-pulse border-dashed",
                !done && !pending && "opacity-60",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  done ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className="font-medium leading-tight">{step.label}</span>
            </li>
          );
        })}
      </ol>

      {pending && (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
          Sending payload to the model (headers + body). This may take a few
          seconds.
        </p>
      )}

      {active && (
        <div className="space-y-4 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Detected provider
            </span>
            <Badge variant="secondary">{active.providerGuess}</Badge>
            <Badge variant={confidenceVariant(active.providerConfidence)}>
              {active.providerConfidence} confidence
            </Badge>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Event
            </p>
            <p className="font-mono text-sm">{active.eventType}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {active.eventTypeDescription}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Plain English
            </p>
            <p className="text-sm leading-relaxed">
              {active.plainEnglishSummary}
            </p>
          </div>

          {active.keyFields && active.keyFields.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Notable fields
              </p>
              <dl className="grid gap-1 text-xs sm:grid-cols-2">
                {active.keyFields.map((f) => (
                  <div
                    key={f.name}
                    className="flex gap-2 rounded bg-muted/50 px-2 py-1"
                  >
                    <dt className="font-mono text-muted-foreground shrink-0">
                      {f.name}
                    </dt>
                    <dd className="truncate font-mono">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Suggested handler ({active.suggestedHandler.language})
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => void copyCode()}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span className="ml-1">{copied ? "Copied" : "Copy"}</span>
              </Button>
            </div>
            {active.suggestedHandler.notes ? (
              <p className="text-xs text-muted-foreground mb-2">
                {active.suggestedHandler.notes}
              </p>
            ) : null}
            <pre className="text-xs bg-slate-100 dark:bg-slate-900 p-3 rounded overflow-x-auto max-h-72 overflow-y-auto whitespace-pre-wrap">
              {active.suggestedHandler.code}
            </pre>
          </div>

          <p className="text-[10px] text-muted-foreground">
            Model: {active.model} ·{" "}
            {new Date(active.analyzedAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

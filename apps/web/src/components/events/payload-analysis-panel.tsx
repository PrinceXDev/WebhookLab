"use client";

import type { AiPayloadAnalysis } from "@webhooklab/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  ANALYSIS_STEPS,
  COPY_FEEDBACK_DURATION,
  getConfidenceVariant,
} from "@/constants";
import {
  Check,
  Copy,
  Loader2,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

type PayloadAnalysisPanelProps = {
  endpointSlug: string;
  eventId: string;
  analysis?: AiPayloadAnalysis;
};

const PayloadAnalysisPanel = ({
  endpointSlug,
  eventId,
  analysis,
}: PayloadAnalysisPanelProps) => {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: (regenerate: boolean) =>
      apiClient.post<{ id: string; aiAnalysis?: AiPayloadAnalysis }>(
        `/api/endpoints/${endpointSlug}/events/${eventId}/analyze`,
        { regenerate },
      ),
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

  const copyCode = async () => {
    const code = analysis?.suggestedHandler.code;
    if (!code) {
      return;
    }

    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION);
  };

  return (
    <div className="rounded-lg border bg-gradient-to-b from-primary/5 to-transparent p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          <h4 className="text-sm font-semibold">AI payload insights</h4>
        </div>
        <div className="flex flex-wrap gap-2">
          {analysis ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => mutate(true)}
            >
              {isPending ? (
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
              disabled={isPending}
              onClick={() => mutate(false)}
            >
              {isPending ? (
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
        {ANALYSIS_STEPS.map((step, i) => {
          const done = Boolean(analysis) && !isPending;
          return (
            <li
              key={step.key}
              className={cn(
                "flex items-center gap-2 rounded-md border px-2 py-2 text-xs",
                done && "border-primary/40 bg-primary/5",
                isPending && i === 0 && "animate-pulse border-dashed",
                !done && !isPending && "opacity-60",
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

      {isPending && (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <Sparkles className="h-6 w-6 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm font-medium">Analyzing Webhook Payload</p>
            <p className="text-xs text-muted-foreground max-w-md">
              AI is examining the payload structure, detecting providers, and
              generating insights. This may take a few seconds...
            </p>
          </div>
        </div>
      )}

      {analysis && (
        <div className="space-y-4 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Detected provider
            </span>
            <Badge variant="secondary">{analysis.providerGuess}</Badge>
            <Badge variant={getConfidenceVariant(analysis.providerConfidence)}>
              {analysis.providerConfidence} confidence
            </Badge>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Event
            </p>
            <p className="font-mono text-sm">{analysis.eventType}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {analysis.eventTypeDescription}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Plain English
            </p>
            <p className="text-sm leading-relaxed">
              {analysis.plainEnglishSummary}
            </p>
          </div>

          {analysis.anomalyDetection &&
            analysis.anomalyDetection.level !== "none" &&
            (() => {
              const { level, score, explanation, flags } =
                analysis.anomalyDetection;
              const levelStyles = {
                high: {
                  container: "border-red-500 bg-red-50 dark:bg-red-950",
                  icon: "text-red-600",
                },
                medium: {
                  container:
                    "border-orange-500 bg-orange-50 dark:bg-orange-950",
                  icon: "text-orange-600",
                },
                low: {
                  container:
                    "border-yellow-500 bg-yellow-50 dark:bg-yellow-950",
                  icon: "text-yellow-600",
                },
              }[level];

              return (
                <div
                  className={cn("rounded-lg border p-3", levelStyles.container)}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      className={cn("h-4 w-4 mt-0.5", levelStyles.icon)}
                    />
                    <div className="flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide mb-1">
                        Anomaly Detected (Score: {score}/100)
                      </p>
                      <p className="text-sm mb-2">{explanation}</p>
                      {flags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {flags.map((flag) => (
                            <Badge
                              key={flag}
                              variant="outline"
                              className="text-xs"
                            >
                              {flag.replaceAll("_", " ")}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

          {analysis.businessIntent && (
            <div className="rounded-lg border border-blue-500 bg-blue-50 dark:bg-blue-950 p-3">
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 mt-0.5 text-blue-600" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wide mb-1">
                    Business Intent
                  </p>
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    {analysis.businessIntent}
                  </p>
                </div>
              </div>
            </div>
          )}

          {analysis.suggestedActions &&
            analysis.suggestedActions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Suggested Actions
                </p>
                <ul className="space-y-1">
                  {analysis.suggestedActions.map((action) => (
                    <li key={action} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-1">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {analysis.changeDetection &&
            analysis.changeDetection.hasChanges &&
            (() => {
              const { summary, changes } = analysis.changeDetection;
              return (
                <div className="rounded-lg border border-purple-500 bg-purple-50 dark:bg-purple-950 p-3">
                  <p className="text-xs font-semibold text-purple-900 dark:text-purple-100 uppercase tracking-wide mb-2">
                    Changes from Previous Event
                  </p>
                  <p className="text-sm text-purple-900 dark:text-purple-100 mb-2">
                    {summary}
                  </p>
                  {changes.length > 0 && (
                    <div className="space-y-1">
                      {changes.map(
                        ({
                          changeType,
                          field,
                          previousValue,
                          currentValue,
                        }) => (
                          <div
                            key={`${field}-${changeType}`}
                            className="text-xs font-mono bg-white/50 dark:bg-black/50 rounded px-2 py-1"
                          >
                            <Badge variant="outline" className="mr-2">
                              {changeType}
                            </Badge>
                            <span className="font-semibold">{field}</span>
                            {previousValue && (
                              <span className="text-muted-foreground">
                                {" "}
                                from {previousValue}
                              </span>
                            )}
                            <span className="text-muted-foreground"> to </span>
                            <span>{currentValue}</span>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

          {analysis.keyFields && analysis.keyFields.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Notable fields
              </p>
              <dl className="grid gap-1 text-xs sm:grid-cols-2">
                {analysis.keyFields.map(({ name, value }) => (
                  <div
                    key={name}
                    className="flex gap-2 rounded bg-muted/50 px-2 py-1"
                  >
                    <dt className="font-mono text-muted-foreground shrink-0">
                      {name}
                    </dt>
                    <dd className="truncate font-mono">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Suggested handler ({analysis.suggestedHandler.language})
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
            {analysis.suggestedHandler.notes && (
              <p className="text-xs text-muted-foreground mb-2">
                {analysis.suggestedHandler.notes}
              </p>
            )}
            <pre className="text-xs bg-slate-100 dark:bg-slate-900 p-3 rounded overflow-x-auto max-h-72 overflow-y-auto whitespace-pre-wrap">
              {analysis.suggestedHandler.code}
            </pre>
          </div>

          <p className="text-[10px] text-muted-foreground">
            Model: {analysis.model} ·{" "}
            {new Date(analysis.analyzedAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
};

export default PayloadAnalysisPanel;

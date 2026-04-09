"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RotateCw } from "lucide-react";
import PayloadAnalysisPanel from "./payload-analysis-panel";
import type { AiPayloadAnalysis } from "@webhooklab/shared";
import { useToast } from "@/components/ui/use-toast";

interface ForwardingResult {
  targetUrl: string;
  statusCode?: number;
  responseBody?: string;
  responseHeaders?: Record<string, string>;
  latencyMs?: number;
  error?: string;
  attemptedAt: number;
}

interface SignatureVerification {
  provider: string;
  isValid: boolean;
  status: string;
  algorithm?: string;
  message?: string;
}

interface EventDetailsTabsProps {
  event: {
    id: string;
    method: string;
    headers: Record<string, string>;
    body: string;
    sourceIp: string;
    contentType: string;
    timestamp: number;
    signatureVerification?: SignatureVerification;
    forwardingResult?: ForwardingResult;
    retryCount?: number;
    aiAnalysis?: AiPayloadAnalysis;
  };
  endpointSlug: string;
  redisTtl?: string;
}

type TabType = "details" | "payload" | "ai-analysis";

export const EventDetailsTabs = ({
  event,
  endpointSlug,
  redisTtl,
}: EventDetailsTabsProps) => {
  const {
    id,
    method,
    headers,
    body,
    sourceIp,
    contentType,
    forwardingResult,
    signatureVerification,
    retryCount,
    aiAnalysis,
  } = event;

  const [activeTab, setActiveTab] = useState<TabType>("details");
  const [isReplaying, setIsReplaying] = useState(false);
  const { toast } = useToast();

  const tabs: { id: TabType; label: string }[] = [
    { id: "details", label: "Details" },
    { id: "payload", label: "Payload" },
    { id: "ai-analysis", label: "AI Analysis" },
  ];

  const formatJson = (str: string) => {
    try {
      return JSON.stringify(JSON.parse(str), null, 2);
    } catch {
      return str;
    }
  };

  const handleReplay = async () => {
    setIsReplaying(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/endpoints/${endpointSlug}/events/${id}/replay`,
        {
          method: "POST",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const { error: errMsg } = await response.json();
        throw new Error(errMsg || "Failed to replay event");
      }

      const { replayEvent } = await response.json();

      toast({
        title: "Event Replayed",
        description: `Successfully replayed event. New event ID: ${replayEvent.id}`,
      });
    } catch (error) {
      toast({
        title: "Replay Failed",
        description:
          error instanceof Error ? error.message : "Failed to replay event",
        variant: "destructive",
      });
    } finally {
      setIsReplaying(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b">
        <div className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {forwardingResult && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleReplay}
            disabled={isReplaying}
            className="mb-2"
          >
            <RotateCw
              className={cn("mr-2 h-4 w-4", isReplaying && "animate-spin")}
            />
            Replay Event
          </Button>
        )}
      </div>

      <div className="min-h-[200px]">
        {activeTab === "details" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailItem label="Source IP" value={sourceIp} />
              <DetailItem label="Event Type" value={method} />
              <DetailItem label="Content Type" value={contentType} />
              <DetailItem label="Event ID" value={id} mono />

              {signatureVerification && (
                <>
                  <DetailItem
                    label="Signature Valid"
                    value={signatureVerification.isValid ? "Yes" : "No"}
                    valueClassName={
                      signatureVerification.isValid
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }
                  />
                  <DetailItem
                    label="Provider"
                    value={signatureVerification.provider.toUpperCase()}
                  />
                  {signatureVerification.algorithm && (
                    <DetailItem
                      label="Algorithm"
                      value={signatureVerification.algorithm}
                    />
                  )}
                </>
              )}

              {forwardingResult && (
                <>
                  <DetailItem
                    label="Forwarding Target"
                    value={forwardingResult.targetUrl}
                    mono
                  />
                  {forwardingResult.statusCode !== undefined && (
                    <DetailItem
                      label="Response Status"
                      value={String(forwardingResult.statusCode)}
                      valueClassName={
                        forwardingResult.statusCode >= 200 &&
                        forwardingResult.statusCode < 300
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }
                    />
                  )}
                  {forwardingResult.latencyMs !== undefined && (
                    <DetailItem
                      label="Forwarding Latency"
                      value={`${forwardingResult.latencyMs}ms`}
                    />
                  )}
                  {forwardingResult.error && (
                    <div className="col-span-full">
                      <DetailItem
                        label="Forwarding Error"
                        value={forwardingResult.error}
                        valueClassName="text-red-600 dark:text-red-400"
                      />
                    </div>
                  )}
                </>
              )}

              <DetailItem
                label="Retry Count"
                value={retryCount?.toString() ?? "0"}
              />

              {redisTtl && <DetailItem label="Redis TTL" value={redisTtl} />}
            </div>

            {forwardingResult?.responseHeaders && (
              <div>
                <h4 className="mb-2 text-sm font-semibold">Response Headers</h4>
                <pre className="overflow-x-auto rounded bg-slate-100 p-3 text-xs dark:bg-slate-900">
                  {JSON.stringify(forwardingResult.responseHeaders, null, 2)}
                </pre>
              </div>
            )}

            {forwardingResult?.responseBody && (
              <div>
                <h4 className="mb-2 text-sm font-semibold">Response Body</h4>
                <pre className="max-h-64 overflow-y-auto overflow-x-auto rounded bg-slate-100 p-3 text-xs dark:bg-slate-900">
                  {formatJson(forwardingResult.responseBody)}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === "payload" && (
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 text-sm font-semibold">Request Headers</h4>
              <pre className="overflow-x-auto rounded bg-slate-100 p-3 text-xs dark:bg-slate-900">
                {JSON.stringify(headers, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold">Request Body</h4>
              <pre className="max-h-96 overflow-y-auto overflow-x-auto rounded bg-slate-100 p-3 text-xs dark:bg-slate-900">
                {body ? formatJson(body) : "(empty)"}
              </pre>
            </div>
          </div>
        )}

        {activeTab === "ai-analysis" && (
          <PayloadAnalysisPanel
            endpointSlug={endpointSlug}
            eventId={id}
            analysis={aiAnalysis}
          />
        )}
      </div>
    </div>
  );
};

type DetailItemProps = {
  label: string;
  value: string;
  mono?: boolean;
  valueClassName?: string;
};

const DetailItem = ({
  label,
  value,
  mono = false,
  valueClassName,
}: DetailItemProps) => (
  <div>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div
      className={cn(
        "mt-1 text-sm font-medium",
        mono && "font-mono",
        valueClassName,
      )}
    >
      {value}
    </div>
  </div>
);

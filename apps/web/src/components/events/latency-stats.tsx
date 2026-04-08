"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  HelpCircle,
} from "lucide-react";
import { STAGE_LATENCY_SUMMARY_COLUMNS } from "@/constants/latency";

interface LatencyStatsProps {
  endpointSlug: string;
}

interface StatsResponse {
  count: number;
  p50: number | null;
  p95: number | null;
  p99: number | null;
  min: number | null;
  max: number | null;
  avg: number | null;
  stageLatencies: Record<
    string,
    { p50: number; p95: number; p99: number; avg: number; count: number }
  >;
  successRate: number;
  successCount: number;
  errorCount: number;
}

const formatMs = (ms: number | null) => {
  if (ms === null) {
    return "N/A";
  }
  return `${ms}ms`;
};

const LatencyStats = ({ endpointSlug }: LatencyStatsProps) => {
  const { data: stats, isLoading } = useQuery<StatsResponse>({
    queryKey: ["stats", endpointSlug],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/endpoints/${endpointSlug}/stats`,
      );
      if (!res.ok) {
        throw new Error("Failed to fetch statistics");
      }
      return res.json();
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <Activity className="h-6 w-6 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">
                Calculating Performance Metrics
              </p>
              <p className="text-xs text-muted-foreground">
                Analyzing webhook latency data...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.count === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No performance data available yet. Send some webhooks to see
            statistics.
          </p>
        </CardContent>
      </Card>
    );
  }

  const {
    count,
    p50,
    p95,
    p99,
    min,
    max,
    avg,
    stageLatencies,
    successRate,
    successCount,
    errorCount,
  } = stats;

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label="Median Latency"
              sublabel="P50"
              value={formatMs(p50)}
              icon={<Clock className="h-4 w-4" />}
              tooltip="50% of requests are faster than this. This is the typical response time most users experience."
            />
            <StatCard
              label="95th Percentile"
              sublabel="P95"
              value={formatMs(p95)}
              icon={<TrendingUp className="h-4 w-4" />}
              tooltip="95% of requests are faster than this. Only 5% of requests take longer. Good for identifying occasional slowdowns."
            />
            <StatCard
              label="99th Percentile"
              sublabel="P99"
              value={formatMs(p99)}
              icon={<TrendingUp className="h-4 w-4" />}
              tooltip="99% of requests are faster than this. Represents worst-case scenarios. Important for SLA compliance."
            />
            <StatCard
              label="Average Latency"
              sublabel="Mean"
              value={formatMs(avg)}
              icon={<Activity className="h-4 w-4" />}
              tooltip="The mathematical average of all request times. Can be skewed by outliers."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <StatCard
              label="Fastest Request"
              sublabel="Minimum"
              value={formatMs(min)}
              icon={<TrendingDown className="h-4 w-4 text-green-500" />}
              tooltip="The fastest webhook processing time recorded. Represents best-case performance."
            />
            <StatCard
              label="Slowest Request"
              sublabel="Maximum"
              value={formatMs(max)}
              icon={<TrendingUp className="h-4 w-4 text-red-500" />}
              tooltip="The slowest webhook processing time recorded. May indicate performance issues or timeouts."
            />
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Success Rate</h4>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {successCount} successful / {errorCount} errors
                  </span>
                  <span className="font-semibold">{successRate}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${successRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {Object.keys(stageLatencies).length > 0 && (
            <div>
              <h4 className="mb-3 text-sm font-semibold">Stage Latencies</h4>
              <div className="space-y-3">
                {Object.entries(stageLatencies).map(([stage, latency]) => {
                  const { count: samples } = latency;
                  return (
                    <div key={stage} className="rounded-lg border bg-card p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">
                          {stage.replaceAll("_", " ")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {samples} samples
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        {STAGE_LATENCY_SUMMARY_COLUMNS.map(({ key, label }) => (
                          <div key={key}>
                            <div className="text-muted-foreground">{label}</div>
                            <div className="font-medium">{latency[key]}ms</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Based on the last {count} events with timing data
          </p>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

type StatCardProps = {
  label: string;
  sublabel?: string;
  value: string;
  icon: ReactNode;
  tooltip?: string;
};

const StatCard = ({ label, sublabel, value, icon, tooltip }: StatCardProps) => {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-1 flex items-center gap-2 text-muted-foreground">
        {icon}
        <div className="flex items-center gap-1 flex-1">
          <span className="text-xs font-medium">{label}</span>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3 w-3 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      {sublabel && (
        <div className="text-[10px] text-muted-foreground mb-1">{sublabel}</div>
      )}
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
};

export default LatencyStats;

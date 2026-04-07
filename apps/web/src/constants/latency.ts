/** Per-stage latency row: P50 / P95 / P99 / Avg columns in the stats UI. */
export const STAGE_LATENCY_SUMMARY_COLUMNS = [
  { key: "p50", label: "P50" },
  { key: "p95", label: "P95" },
  { key: "p99", label: "P99" },
  { key: "avg", label: "Avg" },
] as const;

export type StageLatencySummaryKey =
  (typeof STAGE_LATENCY_SUMMARY_COLUMNS)[number]["key"];

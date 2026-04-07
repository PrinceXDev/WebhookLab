/** Webhook pipeline stages shown in timelines and charts. */
export const TIMELINE_STAGE_NAMES = [
  "received",
  "verified",
  "parsed",
  "forwarded",
  "responded",
] as const;

export type TimelineStageName = (typeof TIMELINE_STAGE_NAMES)[number];

export type TimelineStageStatus = "pending" | "active" | "done" | "error";

export interface TimelineStage {
  name: TimelineStageName;
  status: TimelineStageStatus;
  timestamp: number;
  durationMs?: number;
  error?: string;
}

/** Full labels (timeline / Gantt bar text). */
export const TIMELINE_STAGE_LABELS: Record<TimelineStageName, string> = {
  received: "Webhook Received",
  verified: "Signature Verified",
  parsed: "Payload Parsed",
  forwarded: "Forwarded to Target",
  responded: "Response Received",
};

/** Short labels (latency bar, compact UI). */
export const TIMELINE_STAGE_LABELS_SHORT: Record<TimelineStageName, string> = {
  received: "Receive",
  verified: "Verify",
  parsed: "Parse",
  forwarded: "Forward",
  responded: "Respond",
};

/** Legend copy without emoji (matches stage color semantics). */
export const TIMELINE_STAGE_LEGEND_LABELS: Record<TimelineStageName, string> = {
  received: "Received",
  verified: "Verified",
  parsed: "Parsed",
  forwarded: "Forwarded",
  responded: "Responded",
};

/** Hex colors for Google Charts and any canvas/SVG use. */
export const TIMELINE_STAGE_HEX: Record<TimelineStageName, string> = {
  received: "#3b82f6",
  verified: "#10b981",
  parsed: "#eab308",
  forwarded: "#f97316",
  responded: "#a855f7",
};

/** Tailwind `bg-*` classes for dots, bars, legend swatches. */
export const TIMELINE_STAGE_BG_CLASS: Record<TimelineStageName, string> = {
  received: "bg-blue-500",
  verified: "bg-green-500",
  parsed: "bg-yellow-500",
  forwarded: "bg-orange-500",
  responded: "bg-purple-500",
};

export const TIMELINE_GOOGLE_CHART_COLORS = TIMELINE_STAGE_NAMES.map(
  (name) => TIMELINE_STAGE_HEX[name],
);

const HEX_ERROR = "#ef4444";
const HEX_ACTIVE = "#3b82f6";
const HEX_PENDING = "#9ca3af";
const HEX_FALLBACK = "#6b7280";

export const getGoogleTimelineBarColor = (
  name: TimelineStageName,
  status: TimelineStageStatus,
): string => {
  switch (status) {
    case "error":
      return HEX_ERROR;
    case "active":
      return HEX_ACTIVE;
    case "pending":
      return HEX_PENDING;
    case "done":
      return TIMELINE_STAGE_HEX[name] ?? HEX_FALLBACK;
    default:
      return HEX_FALLBACK;
  }
};

/** Status + stage → dot class for stage detail rows. */
export const getTimelineStageDotClass = (
  name: TimelineStageName,
  status: TimelineStageStatus,
): string => {
  if (status === "error") {
    return "bg-red-500";
  }
  if (status === "active") {
    return "bg-blue-500 animate-pulse";
  }
  if (status === "pending") {
    return "bg-gray-400";
  }
  if (status === "done") {
    return TIMELINE_STAGE_BG_CLASS[name];
  }
  return "bg-gray-400";
};

export const computeStageEndTime = (
  stages: readonly Pick<TimelineStage, "timestamp" | "durationMs">[],
  index: number,
): Date => {
  const stage = stages[index];
  if (!stage) {
    return new Date();
  }
  if (stage.durationMs !== undefined && stage.durationMs > 0) {
    return new Date(stage.timestamp + stage.durationMs);
  }
  if (index < stages.length - 1) {
    return new Date(stages[index + 1].timestamp);
  }
  return new Date(stage.timestamp + 1);
};

const GOOGLE_TIMELINE_COLUMN_DEFS = [
  { type: "string", id: "Stage" },
  { type: "string", id: "Label" },
  { type: "string", role: "style" },
  { type: "date", id: "Start" },
  { type: "date", id: "End" },
] as const;

export const buildGoogleTimelineChartData = (
  stages: readonly TimelineStage[],
): unknown[] => {
  const headerRow = [...GOOGLE_TIMELINE_COLUMN_DEFS];
  const rows: unknown[][] = stages.map((stage, i) => {
    const startTime = new Date(stage.timestamp);
    const endTime = computeStageEndTime(stages, i);
    const color = getGoogleTimelineBarColor(stage.name, stage.status);
    const durationPart =
      stage.durationMs !== undefined && stage.durationMs > 0
        ? ` (${stage.durationMs}ms)`
        : "";
    const label = `${TIMELINE_STAGE_LABELS[stage.name]}${durationPart}`;
    return [stage.name, label, color, startTime, endTime];
  });
  return [headerRow, ...rows];
};

/** Legend rows: five stages + error state. */
export const TIMELINE_CHART_LEGEND_ITEMS: ReadonlyArray<{
  id: TimelineStageName | "error";
  label: string;
  swatchClass: string;
}> = [
  ...TIMELINE_STAGE_NAMES.map((name) => ({
    id: name,
    label: TIMELINE_STAGE_LEGEND_LABELS[name],
    swatchClass: TIMELINE_STAGE_BG_CLASS[name],
  })),
  { id: "error", label: "Error", swatchClass: "bg-red-500" },
];

/** Default options for `react-google-charts` Timeline. */
export const GOOGLE_TIMELINE_CHART_OPTIONS = {
  timeline: {
    showRowLabels: true,
    showBarLabels: true,
    groupByRowLabel: false,
    colorByRowLabel: false,
  },
  backgroundColor: "transparent",
  colors: [...TIMELINE_GOOGLE_CHART_COLORS],
  hAxis: {
    format: "HH:mm:ss.SSS",
    textStyle: {
      fontSize: 11,
    },
  },
  tooltip: {
    isHtml: true,
    trigger: "both" as const,
  },
  avoidOverlappingGridLines: false,
};

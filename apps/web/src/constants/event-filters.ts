export type EventStatusFilterValue = "success" | "error" | "processing";

export const EVENT_STATUS_FILTER_OPTIONS: ReadonlyArray<{
  value: EventStatusFilterValue;
  label: string;
}> = [
  { value: "success", label: "Success" },
  { value: "error", label: "Error" },
  { value: "processing", label: "Processing" },
];

export const EVENT_STATUS_FILTER_LABEL_BY_VALUE = Object.fromEntries(
  EVENT_STATUS_FILTER_OPTIONS.map((o) => [o.value, o.label]),
) as Record<EventStatusFilterValue, string>;

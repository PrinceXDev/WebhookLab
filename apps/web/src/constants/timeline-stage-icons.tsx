"use client";

import type { ReactNode } from "react";
import { Check, X, Clock } from "lucide-react";
import type { TimelineStageStatus } from "./timeline";

export const TIMELINE_STAGE_STATUS_ICONS: Record<
  TimelineStageStatus,
  ReactNode
> = {
  pending: <Clock className="h-4 w-4 text-gray-400" />,
  active: <Clock className="h-4 w-4 text-blue-500 animate-pulse" />,
  done: <Check className="h-4 w-4 text-green-500" />,
  error: <X className="h-4 w-4 text-red-500" />,
};

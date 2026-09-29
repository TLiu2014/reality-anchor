import type { RiskLevel } from "@/lib/mcp/distortions";

/** Accent color + pill classes per risk tier (used by AnalysisNode). */
export const RISK_STYLES: Record<
  RiskLevel,
  { label: string; color: string; pill: string }
> = {
  low: {
    label: "Low risk",
    color: "#22c55e",
    pill: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  medium: {
    label: "Medium risk",
    color: "#eab308",
    pill: "bg-amber-100 text-amber-800 ring-1 ring-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300",
  },
  high: {
    label: "High risk",
    color: "#ef4444",
    pill: "bg-red-100 text-red-700 ring-1 ring-red-500/40 dark:bg-red-500/15 dark:text-red-300",
  },
};

/**
 * Shared handle styling. Subtle — this view is read, not authored, so we don't
 * want fat connection dots competing for attention. Theme-aware.
 */
export const HANDLE_CLASS =
  "!h-2 !w-2 !border !border-slate-300 !bg-white dark:!border-slate-600 dark:!bg-slate-800";

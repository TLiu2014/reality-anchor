import type { ReactNode } from "react";

/**
 * Dependency-free architecture overview — styled boxes + arrows, theme-aware.
 * A quick read of the whole system; the full Mermaid diagram lives in the
 * expandable section below it on /docs.
 */

const TONES: Record<string, string> = {
  slate: "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900",
  indigo:
    "border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/40",
  violet:
    "border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/40",
  amber:
    "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40",
  emerald:
    "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40",
};

function Box({
  tone = "slate",
  title,
  sub,
  children,
}: {
  tone?: keyof typeof TONES | string;
  title: string;
  sub?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`w-full rounded-xl border p-3.5 text-center ${TONES[tone] ?? TONES.slate}`}
    >
      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        {title}
      </div>
      {sub && (
        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {sub}
        </div>
      )}
      {children}
    </div>
  );
}

function Arrow({ label, dir = "down" }: { label?: string; dir?: "down" | "up" }) {
  return (
    <div className="flex flex-col items-center py-1 text-slate-400">
      {label && (
        <span className="mb-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {label}
        </span>
      )}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        {dir === "down" ? (
          <path d="M12 5v14M6 13l6 6 6-6" />
        ) : (
          <path d="M12 19V5M6 11l6-6 6 6" />
        )}
      </svg>
    </div>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
      {children}
    </span>
  );
}

export function ArchitectureDiagram() {
  return (
    <div className="mx-auto max-w-md">
      <Box
        tone="violet"
        title="Alexa+ — the model"
        sub="voice on Echo · text in the Alexa app (the MCP client)"
      />

      <Arrow label="MCP tool calls · Streamable HTTP" />

      <Box tone="indigo" title="/api/mcp — MCP server">
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          <Pill>get_baseline_rules</Pill>
          <Pill>evaluate_cognitive_distortion</Pill>
          <Pill>trigger_erp_delay</Pill>
        </div>
      </Box>

      <Arrow label="analysis (model first)" />

      <Box
        tone="emerald"
        title="Real model — Claude"
        sub="Anthropic API or Amazon Bedrock · keyword heuristic fallback"
      />

      <Arrow label="Alexa+ opens /mcp-view?tool=…&trigger=…" dir="up" />

      <Box
        tone="slate"
        title="/mcp-view — visual grounding UI"
        sub="React Flow · Zustand · hydrated from the tool context"
      >
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          <Pill>/api/analyze</Pill>
          <Pill>anchors</Pill>
          <Pill>step-by-step flow</Pill>
        </div>
      </Box>

      <Arrow label="user: I waited it out → /api/resume-session" />

      <Box
        tone="amber"
        title="Human-in-the-loop"
        sub="the ERP delay hands control to the user, then closes the loop"
      />

      <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
        Alexa+ orchestrates the tools; RealityAnchor supplies the analysis and the
        visual grounding.
      </p>
    </div>
  );
}

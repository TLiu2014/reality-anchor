"use client";

import { useEffect, useState } from "react";
import { useAnchorStore } from "@/store/useAnchorStore";
import { isAiConnected } from "@/lib/byok";

/**
 * Nav pill showing whether a real model is driving the agent. "Connected" when
 * EITHER the user pasted BYOK creds (localStorage) OR the server env has a
 * provider configured (probed once via GET /api/agent).
 */
export function ConnectionPill() {
  const bedrock = useAnchorStore((s) => s.bedrock);
  const fallbackMode = useAnchorStore((s) => s.fallbackMode);
  const [serverProvider, setServerProvider] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/agent")
      .then((r) => r.json())
      .then((d) => {
        if (alive) setServerProvider(d?.provider ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const byok = isAiConnected(bedrock);
  const connected = byok || Boolean(serverProvider);

  let label: string;
  let tone: string;
  let dot: string;
  let title: string;

  if (connected) {
    const onBedrock = byok || serverProvider === "bedrock";
    label = onBedrock ? "Bedrock connected" : "Claude connected";
    tone =
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300";
    dot = "bg-emerald-500";
    title = onBedrock
      ? byok
        ? "Driving the agent with your Amazon Bedrock key"
        : "Driving the agent with Amazon Bedrock (server env)"
      : "Driving the agent with the Claude API (server env)";
  } else if (fallbackMode === "alert") {
    label = "Not connected";
    tone =
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300";
    dot = "bg-amber-500";
    title = "No AI key — analyses are blocked until you connect one";
  } else {
    label = "Heuristic mode";
    tone =
      "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
    dot = "bg-slate-400";
    title = "No AI key — using the built-in offline heuristic";
  }

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}
    >
      <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden />
      {label}
    </span>
  );
}

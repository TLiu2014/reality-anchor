"use client";

import { useEffect, useState } from "react";
import { useAnchorStore, type ErpDelayNodeData } from "@/store/useAnchorStore";

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Compact ERP countdown for the Node Details view — so the timer and "I waited
 * it out" action stay usable when details is the center view (intervention-first
 * layout). The full circular ring lives on the canvas ErpDelayNode; this is the
 * inline panel counterpart.
 */
export function ErpDelayPanel({
  nodeId,
  data,
}: {
  nodeId: string;
  data: ErpDelayNodeData;
}) {
  const commitDelay = useAnchorStore((s) => s.commitDelay);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (data.committed || !data.deadline) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [data.committed, data.deadline]);

  if (data.committed) {
    return (
      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-center dark:border-emerald-800 dark:bg-emerald-950/50">
        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-200">
          Resolved — you broke the loop
        </p>
        <p className="mt-1 text-xs text-emerald-700/90 dark:text-emerald-100/80">
          You sat with the uncertainty instead of checking — the rep that
          retrains the loop.
        </p>
      </div>
    );
  }

  const remaining = data.deadline
    ? Math.max(0, Math.ceil((data.deadline - now) / 1000))
    : 0;
  const finished = remaining === 0;
  const pct = data.totalSeconds > 0 ? (remaining / data.totalSeconds) * 100 : 0;

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
      <div className="text-center">
        <div className="font-mono text-4xl font-black tabular-nums text-amber-700 dark:text-amber-200">
          {fmt(remaining)}
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-amber-200 dark:bg-amber-900">
          <div
            className="h-full rounded-full bg-amber-500 transition-[width] duration-1000 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={() => commitDelay(nodeId)}
        className={
          finished
            ? "mt-4 w-full rounded-lg bg-emerald-500 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-400"
            : "mt-4 w-full rounded-lg bg-amber-400 py-2.5 text-sm font-bold text-amber-950 transition hover:bg-amber-300"
        }
      >
        {finished ? "I waited it out" : "Commit to Delay"}
      </button>
    </div>
  );
}

"use client";

import { memo, useEffect, useState } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useAnchorStore, type ErpDelayNodeData } from "@/store/useAnchorStore";
import { HANDLE_CLASS } from "./nodeStyles";

type ErpDelayNodeType = Node<ErpDelayNodeData, "erpDelay">;

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Geometry for the countdown ring. Large radius = legible across a room.
const R = 92;
const CIRC = 2 * Math.PI * R;

/**
 * ErpDelayNode (yellow) — the Human-in-the-Loop pause. A massive countdown the
 * user urge-surfs, with a "Commit to Delay" button. The countdown reaching zero
 * does NOT auto-resolve — closing the loop is a deliberate human act; when it
 * hits zero the CTA swaps to "I waited it out". On commit it flips to a green
 * "Resolved" state and POSTs the callback.
 */
function ErpDelayNodeImpl({ id, data }: NodeProps<ErpDelayNodeType>) {
  const commitDelay = useAnchorStore((s) => s.commitDelay);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (data.committed || !data.deadline) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [data.committed, data.deadline]);

  const remaining = data.deadline
    ? Math.max(0, Math.ceil((data.deadline - now) / 1000))
    : 0;
  const finished = remaining === 0;
  const pct = data.totalSeconds > 0 ? remaining / data.totalSeconds : 0;

  if (data.committed) {
    return (
      <div className="w-[360px] max-w-[86vw] rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-6 text-center shadow-lg dark:bg-emerald-950/70">
        <Handle type="target" position={Position.Top} className={HANDLE_CLASS} />
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-9 w-9"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
          Resolved
        </p>
        <h3 className="mt-1 text-2xl font-extrabold text-emerald-700 dark:text-emerald-200">
          You broke the loop
        </h3>
        <p className="mt-2 text-base leading-snug text-emerald-700/90 dark:text-emerald-100/90">
          You sat with the uncertainty instead of checking — nothing changed,
          and the urge passed. That&apos;s the rep that retrains the loop.
        </p>
      </div>
    );
  }

  return (
    <div className="w-[360px] max-w-[86vw] rounded-2xl border-2 border-amber-400 bg-amber-50 p-6 text-center shadow-lg dark:bg-amber-950/40">
      <Handle type="target" position={Position.Top} className={HANDLE_CLASS} />

      <span className="text-sm font-bold uppercase tracking-widest text-amber-600 dark:text-amber-300">
        {finished ? "Delay complete" : "ERP delay · sit with it"}
      </span>

      {/* Massive circular countdown. */}
      <div className="relative mx-auto mt-4 h-[220px] w-[220px]">
        <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90" aria-hidden>
          <circle
            cx="110"
            cy="110"
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth="14"
            className="text-amber-200 dark:text-amber-900/60"
          />
          <circle
            cx="110"
            cy="110"
            r={R}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - pct)}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-6xl font-black tabular-nums text-amber-700 dark:text-amber-100">
            {fmt(remaining)}
          </span>
          <span className="mt-1 text-xs font-semibold uppercase tracking-widest text-amber-600/80 dark:text-amber-300/80">
            {finished ? "time's up" : "remaining"}
          </span>
        </div>
      </div>

      <p className="mt-4 text-base leading-snug text-amber-800/90 dark:text-amber-100/90">
        {finished
          ? "You made it through the full delay. Confirm you didn't act on the urge."
          : "Reassurance now is the compulsion — delaying it is the therapy. Sit with the uncertainty and let it crest and fall."}
      </p>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          commitDelay(id);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={
          finished
            ? "nodrag nopan mt-5 w-full rounded-xl bg-emerald-500 py-4 text-lg font-extrabold text-white shadow-md transition hover:bg-emerald-400 active:scale-[0.99]"
            : "nodrag nopan mt-5 w-full rounded-xl bg-amber-400 py-4 text-lg font-extrabold text-amber-950 shadow-md transition hover:bg-amber-300 active:scale-[0.99]"
        }
      >
        {finished ? "I waited it out" : "Commit to Delay"}
      </button>
      <p className="mt-2 text-xs text-amber-700/70 dark:text-amber-300/70">
        {finished
          ? "This tells RealityAnchor you broke the loop."
          : "Committing early counts — the point is choosing not to act now."}
      </p>
    </div>
  );
}

export const ErpDelayNode = memo(ErpDelayNodeImpl);

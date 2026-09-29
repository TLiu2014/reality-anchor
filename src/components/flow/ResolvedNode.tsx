"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { ResolvedNodeData } from "@/store/useAnchorStore";
import { HANDLE_CLASS } from "./nodeStyles";

type ResolvedNodeType = Node<ResolvedNodeData, "resolved">;

/**
 * ResolvedNode (green) — the auto-resolve outcome. When an anchor already shows
 * the action was never warranted, the loop resolves on its own: no ERP delay,
 * no countdown, no user action. A calm, grounded terminal node.
 */
function ResolvedNodeImpl({ data }: NodeProps<ResolvedNodeType>) {
  return (
    <div className="w-[360px] max-w-[86vw] rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-6 text-center shadow-lg dark:bg-emerald-950/70">
      <Handle type="target" position={Position.Top} className={HANDLE_CLASS} />

      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-8 w-8"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
        Resolved automatically
      </p>
      <h3 className="mt-1 text-2xl font-extrabold text-emerald-700 dark:text-emerald-200">
        No action needed
      </h3>
      <p className="mt-2 text-base leading-snug text-emerald-700/90 dark:text-emerald-100/90">
        {data.message}
      </p>

      {data.matchedRule && (
        <div className="mt-4 rounded-xl bg-emerald-500/10 px-4 py-3 text-left ring-1 ring-emerald-500/30">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-300">
            Because your anchor says
          </p>
          <p className="mt-1 text-base font-medium leading-snug text-emerald-800 dark:text-emerald-50">
            {data.matchedRule}
          </p>
        </div>
      )}
    </div>
  );
}

export const ResolvedNode = memo(ResolvedNodeImpl);

"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { TriggerNodeData } from "@/store/useAnchorStore";
import { HANDLE_CLASS } from "./nodeStyles";

type TriggerNodeType = Node<TriggerNodeData, "trigger">;

/**
 * TriggerNode (gray) — what the user said or typed. Entry point of a turn:
 * no incoming handle, one outgoing handle to the analysis.
 */
function TriggerNodeImpl({ data }: NodeProps<TriggerNodeType>) {
  return (
    <div className="w-[360px] max-w-[86vw] rounded-2xl border-2 border-slate-300 bg-white p-5 shadow-lg dark:border-slate-500 dark:bg-slate-800/90">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-500 text-white dark:bg-slate-600"
          aria-hidden
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </span>
        <span className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300">
          You said
        </span>
      </div>

      <p className="mt-3 text-xl font-semibold leading-snug text-slate-900 dark:text-slate-50">
        &ldquo;{data.text}&rdquo;
      </p>

      <Handle
        type="source"
        position={Position.Bottom}
        className={HANDLE_CLASS}
      />
    </div>
  );
}

export const TriggerNode = memo(TriggerNodeImpl);

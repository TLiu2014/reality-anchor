"use client";

import { useMemo } from "react";
import { useAnchorStore, type AppNode } from "@/store/useAnchorStore";
import { nodeMeta } from "@/components/flow/nodeMeta";
import { SampleCards } from "@/components/session/SampleCards";
import { TriggerComposer } from "@/components/session/TriggerComposer";

function TraceChip({ node }: { node: AppNode }) {
  const openDetails = useAnchorStore((s) => s.openDetails);
  const selected = useAnchorStore((s) => s.selectedNodeId === node.id);
  const meta = nodeMeta(node);
  return (
    <button
      type="button"
      onClick={() => openDetails(node.id)}
      className={[
        "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition",
        selected
          ? "border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-950/40"
          : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50",
      ].join(" ")}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: meta.color }}
      />
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-slate-800 dark:text-slate-100">
          {meta.label}
        </span>
        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
          {meta.state}
        </span>
      </span>
    </button>
  );
}

/**
 * Left panel: the session as a trace timeline. The real conversation happens in
 * Alexa+; this mirrors it (one lane of trace chips per turn) and offers a
 * clearly-labeled simulator to drive the flow standalone.
 */
export function SessionPanel() {
  const nodes = useAnchorStore((s) => s.nodes);
  const addTurn = useAnchorStore((s) => s.addTurn);
  const reset = useAnchorStore((s) => s.reset);

  const turns = useMemo(() => {
    const byTurn = new Map<number, AppNode[]>();
    for (const n of nodes) {
      const t = (n.data.turn as number) ?? 0;
      (byTurn.get(t) ?? byTurn.set(t, []).get(t)!).push(n);
    }
    return [...byTurn.entries()].sort((a, b) => a[0] - b[0]);
  }, [nodes]);

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-bold">Session</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Mirrors the Alexa+ conversation
          </p>
        </div>
        {nodes.length > 0 && (
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            New
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {turns.length === 0 ? (
          <>
            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              In production the user talks to <strong>Alexa+</strong>, which
              calls RealityAnchor&apos;s MCP tools — each call appears here as a
              trace and draws on the canvas. To try it standalone, pick an
              example or simulate a trigger below.
            </div>
            <SampleCards onPick={(prompt) => addTurn(prompt, true)} />
          </>
        ) : (
          turns.map(([turn, group]) => {
            const trigger = group.find((n) => n.type === "trigger");
            return (
              <div key={turn} className="space-y-1.5">
                {trigger && (
                  <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Turn {turn + 1}
                  </p>
                )}
                {group.map((n) => (
                  <TraceChip key={n.id} node={n} />
                ))}
              </div>
            );
          })
        )}
      </div>

      <TriggerComposer className="border-t border-slate-200 px-4 py-3 dark:border-slate-800" />
    </aside>
  );
}

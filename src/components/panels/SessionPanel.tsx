"use client";

import { useMemo, useState } from "react";
import { useAnchorStore, type AppNode } from "@/store/useAnchorStore";
import { nodeMeta } from "@/components/flow/nodeMeta";

interface Sample {
  id: string;
  emoji: string;
  title: string;
  prompt: string;
}

const SAMPLES: Sample[] = [
  {
    id: "checking",
    emoji: "🔒",
    title: "Checking urge · you decide",
    prompt:
      "I already locked the front door — but what if I didn't, and the house burns down?",
  },
  {
    id: "contamination",
    emoji: "🧼",
    title: "Contamination · anchor settles it",
    prompt:
      "My hands feel contaminated, but they look completely clean and I haven't touched anything dirty.",
  },
  {
    id: "genuine-risk",
    emoji: "⚠️",
    title: "A real safety signal",
    prompt: "I can smell gas — I think the stove is actually on.",
  },
];

/** Reference-style suggestion cards, shown in the empty trace area. */
function SampleCards({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Try an example
      </p>
      <div className="flex flex-col gap-2">
        {SAMPLES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onPick(s.prompt)}
            className="group flex flex-col gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/30"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                <span className="text-base">{s.emoji}</span>
                {s.title}
              </span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-indigo-500"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </div>
            <span className="line-clamp-2 text-xs leading-snug text-slate-500 dark:text-slate-400">
              &ldquo;{s.prompt}&rdquo;
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

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
  const [text, setText] = useState("");

  // Group nodes into turns for the timeline.
  const turns = useMemo(() => {
    const byTurn = new Map<number, AppNode[]>();
    for (const n of nodes) {
      const t = (n.data.turn as number) ?? 0;
      (byTurn.get(t) ?? byTurn.set(t, []).get(t)!).push(n);
    }
    return [...byTurn.entries()].sort((a, b) => a[0] - b[0]);
  }, [nodes]);

  // Typed input: continue the case if related, else start over.
  const submitTyped = (value: string) => {
    addTurn(value);
    setText("");
  };

  // Presets are independent cases — always start a fresh flow.
  const runPreset = (value: string) => {
    addTurn(value, true);
    setText("");
  };

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
            <SampleCards onPick={runPreset} />
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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) submitTyped(text);
        }}
        className="border-t border-slate-200 px-4 py-3 dark:border-slate-800"
      >
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Simulate a trigger
        </p>
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Describe the worry or urge…"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="shrink-0 rounded-lg bg-indigo-500 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-indigo-400 disabled:opacity-40"
          >
            Anchor
          </button>
        </div>
      </form>
    </aside>
  );
}

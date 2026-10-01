"use client";

import { useEffect, useMemo, useRef } from "react";
import { useAnchorStore, type AppNode, type TriggerNode } from "@/store/useAnchorStore";
import { nodeMeta } from "@/components/flow/nodeMeta";
import { NodeCard } from "@/components/panels/NodeCard";
import { SampleCards } from "@/components/session/SampleCards";
import { TriggerComposer } from "@/components/session/TriggerComposer";
import { ChatWorkspaceCard } from "./ChatEmbedCard";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function UserBubble({ node }: { node: TriggerNode }) {
  const openDetails = useAnchorStore((s) => s.openDetails);
  const selected = useAnchorStore((s) => s.selectedNodeId === node.id);
  const meta = nodeMeta(node);

  return (
    <div className="flex justify-end">
      <button
        type="button"
        id={`node-detail-${node.id}`}
        onClick={() => openDetails(node.id)}
        className={[
          "max-w-[min(100%,28rem)] border-r-2 py-1 pl-3 pr-3 text-left transition",
          selected
            ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40"
            : "border-slate-400 hover:bg-slate-100/80 dark:border-slate-500 dark:hover:bg-slate-800/40",
        ].join(" ")}
      >
        <p className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">
          You said
        </p>
        <p className="mt-0.5 text-sm font-medium leading-snug text-slate-800 dark:text-slate-100">
          {node.data.text}
        </p>
        <span
          className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: meta.color }}
          aria-hidden
        />
      </button>
    </div>
  );
}

function TurnBlock({
  turn,
  nodes,
  selectedNodeId,
}: {
  turn: number;
  nodes: AppNode[];
  selectedNodeId: string | null;
}) {
  const trigger = nodes.find((n): n is TriggerNode => n.type === "trigger");
  const rest = nodes.filter((n) => n.type !== "trigger");

  return (
    <section className="space-y-3" aria-label={`Turn ${turn + 1}`}>
      {trigger && <UserBubble node={trigger} />}
      {rest.map((n) => (
        <NodeCard key={n.id} node={n} active={n.id === selectedNodeId} />
      ))}
    </section>
  );
}

/**
 * Unified chat: transcript on the left; after the first turn, flow and
 * anchors share one tabbed card on the right. Empty state is chat only.
 * ERP countdown lives on the map node only.
 */
export function ChatView() {
  const nodes = useAnchorStore((s) => s.nodes);
  const addTurn = useAnchorStore((s) => s.addTurn);
  const reset = useAnchorStore((s) => s.reset);
  const selectedNodeId = useAnchorStore((s) => s.selectedNodeId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(0);

  const turns = useMemo(() => {
    const byTurn = new Map<number, AppNode[]>();
    for (const n of nodes) {
      const t = (n.data.turn as number) ?? 0;
      (byTurn.get(t) ?? byTurn.set(t, []).get(t)!).push(n);
    }
    return [...byTurn.entries()].sort((a, b) => a[0] - b[0]);
  }, [nodes]);

  const hasTurns = turns.length > 0;

  useEffect(() => {
    const reduce = prefersReducedMotion();
    const behavior: ScrollBehavior = reduce ? "auto" : "smooth";
    if (nodes.length > prevCount.current) {
      bottomRef.current?.scrollIntoView({ behavior, block: "end" });
    } else if (selectedNodeId) {
      document
        .getElementById(`node-detail-${selectedNodeId}`)
        ?.scrollIntoView({ behavior, block: "nearest" });
    }
    prevCount.current = nodes.length;
  }, [nodes.length, selectedNodeId]);

  const transcript = hasTurns ? (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Grounding transcript
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          New
        </button>
      </div>
      {turns.map(([turn, group]) => (
        <TurnBlock
          key={turn}
          turn={turn}
          nodes={group}
          selectedNodeId={selectedNodeId}
        />
      ))}
    </div>
  ) : (
    <div className="space-y-5">
      <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        In production the user talks to <strong>Alexa+</strong>, which calls
        RealityAnchor&apos;s MCP tools — each call appears here as a turn. To
        try it standalone, pick an example or simulate a trigger below.
      </div>
      <SampleCards onPick={(prompt) => addTurn(prompt, true)} />
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50 dark:bg-slate-950">
      {hasTurns ? (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 lg:grid-cols-2 lg:overflow-hidden lg:px-6 lg:py-4">
          <div
            ref={scrollRef}
            className="min-h-0 overflow-y-auto lg:h-full"
          >
            {transcript}
            <div ref={bottomRef} />
          </div>
          <div className="min-h-[22rem] lg:min-h-0 lg:h-full">
            <ChatWorkspaceCard />
          </div>
        </div>
      ) : (
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
            {transcript}
            <div ref={bottomRef} />
          </div>
        </div>
      )}

      <div className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        {hasTurns ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-4 lg:px-6">
            <TriggerComposer className="px-4 py-3 lg:px-0" />
          </div>
        ) : (
          <TriggerComposer className="mx-auto w-full max-w-2xl px-4 py-3 sm:px-6" />
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  useAnchorStore,
  type AppNode,
  type TraceItem,
  type TriggerNode,
} from "@/store/useAnchorStore";
import { nodeMeta } from "@/components/flow/nodeMeta";
import { NodeCard } from "@/components/panels/NodeCard";
import { SampleCards } from "@/components/session/SampleCards";
import { TriggerComposer } from "@/components/session/TriggerComposer";
import { NewChatButton } from "@/components/session/NewChatButton";
import { AnchorsTab } from "@/components/panels/AnchorsTab";
import { ChatWorkspaceCard } from "./ChatEmbedCard";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function UserBubble({ node }: { node: TriggerNode }) {
  const openDetails = useAnchorStore((s) => s.openDetails);
  const selected = useAnchorStore((s) => s.selectedNodeId === node.id);
  const meta = nodeMeta(node);

  // Open details on click, but ignore the click that ends a text selection so
  // the user can drag-select and copy what they said.
  const open = () => {
    if (typeof window !== "undefined" && window.getSelection()?.toString()) return;
    openDetails(node.id);
  };

  return (
    <div className="flex justify-end">
      <div
        id={`node-detail-${node.id}`}
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openDetails(node.id);
          }
        }}
        className={[
          "max-w-[min(100%,28rem)] cursor-pointer border-r-2 py-1 pl-3 pr-3 text-left transition",
          selected
            ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40"
            : "border-slate-400 hover:bg-slate-100/80 dark:border-slate-500 dark:hover:bg-slate-800/40",
        ].join(" ")}
      >
        <p className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">
          You said
        </p>
        <p className="mt-0.5 cursor-text select-text text-sm font-medium leading-snug text-slate-800 dark:text-slate-100">
          {node.data.text}
        </p>
        <span
          className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: meta.color }}
          aria-hidden
        />
      </div>
    </div>
  );
}

function AssistantBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[min(100%,30rem)] rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-3.5 py-2 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-[0.6rem] font-bold uppercase tracking-widest text-indigo-400">
          Alexa+ says
        </p>
        <p className="mt-0.5 text-sm leading-snug text-slate-700 dark:text-slate-200">
          {text}
        </p>
      </div>
    </div>
  );
}

/**
 * Anchors library as a workspace card, mirroring ChatWorkspaceCard so the
 * empty state reads like the in-chat split. Shown beside the suggestion cards.
 */
function AnchorsPanelCard() {
  const setAnchorsOpen = useAnchorStore((s) => s.setAnchorsOpen);
  return (
    <div className="flex h-full min-h-[22rem] min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">
          Anchors
        </span>
        <button
          type="button"
          onClick={() => setAnchorsOpen(false)}
          aria-label="Close anchors"
          className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="h-4 w-4"
            aria-hidden
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        <AnchorsTab />
      </div>
    </div>
  );
}

function McpTrace({ traces }: { traces: TraceItem[] }) {
  if (traces.length === 0) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/50">
      <p className="mb-1 text-[0.6rem] font-bold uppercase tracking-widest text-slate-400">
        Alexa+ called your MCP tools
      </p>
      {traces.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-2 py-0.5 font-mono text-[0.72rem]"
        >
          {t.phase === "call" ? (
            <span className="text-indigo-500">→</span>
          ) : (
            <span className="text-emerald-500">✓</span>
          )}
          <span className="text-slate-700 dark:text-slate-200">{t.name}</span>
          {t.detail && (
            <span className="truncate text-slate-400">· {t.detail}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function TurnBlock({
  turn,
  nodes,
  traces,
  reply,
  selectedNodeId,
}: {
  turn: number;
  nodes: AppNode[];
  traces: TraceItem[];
  reply?: string;
  selectedNodeId: string | null;
}) {
  const trigger = nodes.find((n): n is TriggerNode => n.type === "trigger");
  const rest = nodes.filter((n) => n.type !== "trigger");

  return (
    <section className="space-y-3" aria-label={`Turn ${turn + 1}`}>
      {trigger && <UserBubble node={trigger} />}
      <McpTrace traces={traces} />
      {rest.map((n) => (
        <NodeCard key={n.id} node={n} active={n.id === selectedNodeId} />
      ))}
      {reply && <AssistantBubble text={reply} />}
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
  const traces = useAnchorStore((s) => s.traces);
  const replies = useAnchorStore((s) => s.replies);
  const agentError = useAnchorStore((s) => s.agentError);
  const anchorsOpen = useAnchorStore((s) => s.anchorsOpen);
  const runAgentTurn = useAnchorStore((s) => s.runAgentTurn);
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
        <NewChatButton />
      </div>
      {turns.map(([turn, group]) => (
        <TurnBlock
          key={turn}
          turn={turn}
          nodes={group}
          traces={traces.filter((t) => t.turn === turn)}
          reply={replies.find((r) => r.turn === turn)?.text}
          selectedNodeId={selectedNodeId}
        />
      ))}
      {agentError && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          {agentError}
        </div>
      )}
    </div>
  ) : (
    <div className="space-y-5">
      <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        In production the user talks to <strong>Alexa+</strong>, which calls
        RealityAnchor&apos;s MCP tools — each call appears here as a turn. To
        try it standalone, pick an example or simulate a trigger below.
      </div>
      <SampleCards onPick={(prompt) => runAgentTurn(prompt, true)} />
    </div>
  );

  // Two columns once a chat starts, or in the empty state when the anchors
  // panel is toggled open from the nav bar.
  const twoCol = hasTurns || anchorsOpen;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50 dark:bg-slate-950">
      {twoCol ? (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 lg:grid-cols-2 lg:overflow-hidden lg:px-6 lg:py-4">
          <div
            ref={scrollRef}
            className="min-h-0 overflow-y-auto lg:h-full"
          >
            {transcript}
            <div ref={bottomRef} />
          </div>
          <div className="min-h-[22rem] lg:min-h-0 lg:h-full">
            {hasTurns ? <ChatWorkspaceCard /> : <AnchorsPanelCard />}
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
        {twoCol ? (
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

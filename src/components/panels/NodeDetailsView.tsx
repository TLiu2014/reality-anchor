"use client";

import { useEffect, useRef } from "react";
import {
  useAnchorStore,
  type AppNode,
  type AnalysisNode,
  type ErpDelayNode,
  type ResolvedNode,
  type TriggerNode,
} from "@/store/useAnchorStore";
import { nodeMeta } from "@/components/flow/nodeMeta";
import { RISK_STYLES } from "@/components/flow/nodeStyles";
import { ErpDelayPanel } from "./ErpDelayPanel";

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <div className="mt-1 text-sm leading-snug text-slate-700 dark:text-slate-200">
        {children}
      </div>
    </div>
  );
}

function TriggerBody({ node }: { node: TriggerNode }) {
  return (
    <Section label="What you said">
      <p className="text-base font-medium text-slate-900 dark:text-slate-50">
        &ldquo;{node.data.text}&rdquo;
      </p>
    </Section>
  );
}

function AnalysisBody({ node }: { node: AnalysisNode }) {
  const d = node.data;
  if (d.genuineRisk) {
    return (
      <div className="space-y-3">
        <Section label="Reality check">
          <p className="text-base font-semibold text-red-600 dark:text-red-300">
            This is a real safety signal — not the loop.
          </p>
        </Section>
        <Section label="Why">{d.rationale}</Section>
        <Section label="What to do">{d.suggestedResponse}</Section>
      </div>
    );
  }
  const risk = RISK_STYLES[d.risk];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-100">
          {d.distortion}
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${risk.pill}`}>
          {risk.label}
        </span>
      </div>
      <Section label="Why this is a thinking trap">{d.rationale}</Section>
      {d.matchedRule && (
        <Section label="Checked against your anchor">
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {d.matchedRule}
          </span>
        </Section>
      )}
      <Section label="Suggested response">{d.suggestedResponse}</Section>
    </div>
  );
}

function ErpBody({ node }: { node: ErpDelayNode }) {
  const d = node.data;
  return (
    <div className="space-y-3">
      <Section label="Exposure & Response Prevention">
        <p className="mb-2 text-base font-semibold text-amber-600 dark:text-amber-300">
          {d.committed
            ? "You waited it out and broke the loop."
            : `${d.delayMinutes}-minute delay — sit with the urge.`}
        </p>
        <ErpDelayPanel nodeId={node.id} data={d} />
      </Section>
      <Section label="Why this works">
        Not acting on the compulsion, and letting the anxiety crest and fall, is
        the rep that retrains the loop over time.
      </Section>
      {d.delayId && (
        <Section label="Server delay id">
          <code className="text-xs">{d.delayId}</code>
        </Section>
      )}
    </div>
  );
}

function NodeCard({ node, active }: { node: AppNode; active: boolean }) {
  const meta = nodeMeta(node);
  return (
    <div
      id={`node-detail-${node.id}`}
      className={[
        "rounded-xl border bg-white p-4 shadow-sm transition dark:bg-slate-900",
        active
          ? "border-slate-300 ring-2 ring-indigo-400/60 dark:border-slate-700"
          : "border-slate-200 dark:border-slate-800",
      ].join(" ")}
      style={{ borderTopColor: meta.color, borderTopWidth: 3 }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: meta.color }}
        />
        <h3 className="text-sm font-bold">{meta.label}</h3>
      </div>
      {node.type === "trigger" && <TriggerBody node={node as TriggerNode} />}
      {node.type === "analysis" && <AnalysisBody node={node as AnalysisNode} />}
      {node.type === "erpDelay" && <ErpBody node={node as ErpDelayNode} />}
      {node.type === "resolved" && <ResolvedBody node={node as ResolvedNode} />}
    </div>
  );
}

function ResolvedBody({ node }: { node: ResolvedNode }) {
  const d = node.data;
  return (
    <div className="space-y-3">
      <Section label="Auto-resolved">
        <p className="text-base font-semibold text-emerald-600 dark:text-emerald-300">
          No action needed — the loop resolved on its own.
        </p>
      </Section>
      <Section label="Why">{d.message}</Section>
      {d.matchedRule && (
        <Section label="Because your anchor says">
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {d.matchedRule}
          </span>
        </Section>
      )}
    </div>
  );
}

/** Right-panel "Node Details": a scrollable stack of cards, one per node. */
export function NodeDetailsView() {
  const nodes = useAnchorStore((s) => s.nodes);
  const selectedNodeId = useAnchorStore((s) => s.selectedNodeId);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedNodeId) return;
    const el = document.getElementById(`node-detail-${selectedNodeId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedNodeId, nodes.length]);

  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Node details appear here as the flow is built. Click any node or trace to
        focus it.
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-full space-y-3 overflow-y-auto p-4">
      {nodes.map((n) => (
        <NodeCard key={n.id} node={n} active={n.id === selectedNodeId} />
      ))}
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { useAnchorStore } from "@/store/useAnchorStore";
import { NodeCard } from "./NodeCard";

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

"use client";

import { useEffect } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore,
  type NodeTypes,
} from "@xyflow/react";
import { useAnchorStore } from "@/store/useAnchorStore";
import { TriggerNode } from "./TriggerNode";
import { AnalysisNode } from "./AnalysisNode";
import { ErpDelayNode } from "./ErpDelayNode";
import { ResolvedNode } from "./ResolvedNode";

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  analysis: AnalysisNode,
  erpDelay: ErpDelayNode,
  resolved: ResolvedNode,
};

function AnchorCanvasInner() {
  const nodes = useAnchorStore((s) => s.nodes);
  const edges = useAnchorStore((s) => s.edges);
  const onNodesChange = useAnchorStore((s) => s.onNodesChange);
  const onEdgesChange = useAnchorStore((s) => s.onEdgesChange);
  const onConnect = useAnchorStore((s) => s.onConnect);
  const openDetails = useAnchorStore((s) => s.openDetails);
  const selectedNodeId = useAnchorStore((s) => s.selectedNodeId);
  const rf = useReactFlow();
  const width = useStore((s) => s.width);
  const height = useStore((s) => s.height);
  const sized = width > 10 && height > 10;

  // Re-fit when nodes change or the canvas first gets a real size (tabbed
  // embed can mount at 0×0, then grow).
  const nodeCount = nodes.length;
  useEffect(() => {
    if (nodeCount === 0 || !sized) return;
    const t = setTimeout(
      () => rf.fitView({ padding: 0.18, duration: 400, maxZoom: 1.1 }),
      60
    );
    return () => clearTimeout(t);
  }, [nodeCount, sized, rf]);

  const decorated = nodes.map((n) => ({ ...n, selected: n.id === selectedNodeId }));

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={decorated}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => openDetails(node.id)}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.18, minZoom: 0.3, maxZoom: 1.1 }}
        minZoom={0.25}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        // Read-only grounding view — nodes aren't meant to be dragged. Disabling
        // drag also stops React Flow from swallowing the first pointer on an
        // in-node button (the "Commit to Delay needs two clicks" bug).
        nodesDraggable={false}
        className="h-full w-full"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1}
          color="currentColor"
          className="!text-slate-300 dark:!text-slate-700"
        />
        <Controls className="!rounded-lg !border !border-slate-200 !shadow-md dark:!border-slate-700 dark:!bg-slate-900 [&_button]:dark:!bg-slate-900 [&_button]:dark:!text-slate-200 [&_button]:dark:!border-slate-700" />
      </ReactFlow>

      {nodeCount === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
          <div className="max-w-sm text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-300">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8"
              >
                <circle cx="12" cy="5" r="2.5" />
                <path d="M12 7.5V21M5 13a7 7 0 0 0 14 0M4 13h2M18 13h2" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">
              Name the trigger to anchor it
            </h2>
            <p className="mt-2 text-base text-slate-500 dark:text-slate-400">
              When Alexa+ calls a tool (or you simulate a trigger in the Session
              panel), the flow maps it against your calm baseline here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function AnchorCanvas() {
  return (
    <ReactFlowProvider>
      <AnchorCanvasInner />
    </ReactFlowProvider>
  );
}

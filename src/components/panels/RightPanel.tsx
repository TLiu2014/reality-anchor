"use client";

import { useAnchorStore, type RightTab } from "@/store/useAnchorStore";
import { AnchorCanvas } from "@/components/flow/AnchorCanvas";
import { NodeDetailsView } from "./NodeDetailsView";
import { AnchorsTab } from "./AnchorsTab";

const LABELS: Record<RightTab, string> = {
  details: "Node Details",
  map: "Grounding map",
  anchors: "Anchors",
};

/**
 * Side panel with a configurable tab set. The center view (Node Details or the
 * flow map) lives elsewhere; whichever main view is NOT the center becomes the
 * first tab here, with Anchors last.
 */
export function RightPanel({
  tabs,
  className,
}: {
  tabs: RightTab[];
  className?: string;
}) {
  const rightTab = useAnchorStore((s) => s.rightTab);
  const setRightTab = useAnchorStore((s) => s.setRightTab);
  const active = tabs.includes(rightTab) ? rightTab : tabs[0];

  return (
    <aside
      className={[
        "flex h-full min-h-0 flex-col border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
        className ?? "",
      ].join(" ")}
    >
      <div
        role="tablist"
        className="flex border-b border-slate-200 dark:border-slate-800"
      >
        {tabs.map((key) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setRightTab(key)}
              className={[
                "relative flex-1 px-4 py-3 text-sm font-semibold transition",
                isActive
                  ? "text-indigo-600 dark:text-indigo-300"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100",
              ].join(" ")}
            >
              {LABELS[key]}
              {isActive && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-500" />
              )}
            </button>
          );
        })}
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {active === "details" && <NodeDetailsView />}
        {active === "map" && <AnchorCanvas />}
        {active === "anchors" && (
          <div className="absolute inset-0 flex min-h-0 flex-col">
            <AnchorsTab />
          </div>
        )}
      </div>
    </aside>
  );
}

"use client";

import { useState } from "react";
import { AnchorCanvas } from "@/components/flow/AnchorCanvas";
import { AnchorsTab } from "@/components/panels/AnchorsTab";

type WorkspaceTab = "map" | "anchors";

const TABS: { key: WorkspaceTab; label: string }[] = [
  { key: "map", label: "Flow" },
  { key: "anchors", label: "Anchors" },
];

/**
 * One embedded card: Flow (grounding map) and Anchors as tabs.
 * Both panes stay mounted so the ERP countdown keeps ticking.
 */
export function ChatWorkspaceCard() {
  const [tab, setTab] = useState<WorkspaceTab>("map");

  return (
    <div className="flex h-full min-h-[22rem] min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div
        role="tablist"
        aria-label="Flow and anchors"
        className="flex shrink-0 border-b border-slate-200 dark:border-slate-800"
      >
        {TABS.map(({ key, label }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(key)}
              className={[
                "relative flex-1 px-4 py-3 text-sm font-semibold transition",
                active
                  ? "text-indigo-600 dark:text-indigo-300"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100",
              ].join(" ")}
            >
              {label}
              {active && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-500" />
              )}
            </button>
          );
        })}
      </div>
      <div className="relative min-h-0 flex-1">
        <div className={tab === "map" ? "h-full" : "hidden h-full"}>
          <AnchorCanvas />
        </div>
        <div
          className={
            tab === "anchors"
              ? "absolute inset-0 flex min-h-0 flex-col"
              : "hidden"
          }
        >
          <AnchorsTab />
        </div>
      </div>
    </div>
  );
}

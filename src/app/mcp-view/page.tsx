"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Group, Panel, Separator } from "react-resizable-panels";
import { AnchorCanvas } from "@/components/flow/AnchorCanvas";
import { SessionPanel } from "@/components/panels/SessionPanel";
import { RightPanel } from "@/components/panels/RightPanel";
import { NodeDetailsView } from "@/components/panels/NodeDetailsView";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LayoutMenu } from "@/components/LayoutMenu";
import { useAnchorStore, type RightTab } from "@/store/useAnchorStore";

type MobileView = "session" | "flow" | "panel";

// Draggable divider between the main views (desktop only).
const HANDLE =
  "w-1.5 shrink-0 cursor-col-resize bg-slate-200 transition-colors hover:bg-indigo-400 data-[state=drag]:bg-indigo-500 dark:bg-slate-800 dark:hover:bg-indigo-500";

function AppHeader() {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-950">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-500 dark:text-indigo-300">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <circle cx="12" cy="5" r="2.5" />
            <path d="M12 7.5V21M5 13a7 7 0 0 0 14 0M4 13h2M18 13h2" />
          </svg>
        </span>
        <div>
          <h1 className="text-base font-bold leading-tight">RealityAnchor</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Alexa+ grounding view
          </p>
        </div>
      </Link>
      <div className="flex items-center gap-2">
        <Link
          href="/docs"
          className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 sm:block dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Docs
        </Link>
        <LayoutMenu />
        <ThemeToggle />
      </div>
    </header>
  );
}

function McpView() {
  const hydrateFromContext = useAnchorStore((s) => s.hydrateFromContext);
  const hydrateSettings = useAnchorStore((s) => s.hydrateSettings);
  const layoutMode = useAnchorStore((s) => s.layoutMode);
  const searchParams = useSearchParams();
  const [view, setView] = useState<MobileView>("flow");
  const [isDesktop, setIsDesktop] = useState(true);
  const didHydrateSettings = useRef(false);

  // Intervention-first → details is the center, the map is a side tab.
  // Map-first → the flow diagram is the center, details is a side tab.
  const centerView =
    layoutMode === "intervention" ? <NodeDetailsView /> : <AnchorCanvas />;
  const sideTabs: RightTab[] =
    layoutMode === "intervention" ? ["map", "anchors"] : ["details", "anchors"];

  // Resizable three-pane layout on wide screens; single-pane tabs on narrow.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    // Load persisted anchors + prior session first, then apply URL context so a
    // matching conversationId continues (appends to) the same diagram.
    if (!didHydrateSettings.current) {
      hydrateSettings();
      didHydrateSettings.current = true;
    }
    hydrateFromContext({
      tool: searchParams.get("tool"),
      trigger: searchParams.get("trigger"),
      minutes: searchParams.get("minutes")
        ? Number(searchParams.get("minutes"))
        : null,
      delayId: searchParams.get("delayId"),
      conversationId: searchParams.get("conversationId"),
      userId: searchParams.get("userId"),
    });
  }, [searchParams, hydrateFromContext, hydrateSettings]);

  const tab = (key: MobileView, label: string) => (
    <button
      type="button"
      onClick={() => setView(key)}
      className={[
        "flex-1 py-2 text-sm font-semibold transition",
        view === key
          ? "border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-300"
          : "text-slate-500 dark:text-slate-400",
      ].join(" ")}
    >
      {label}
    </button>
  );

  return (
    <main className="flex h-dvh flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <AppHeader />

      {isDesktop ? (
        // Desktop: three resizable panes with draggable dividers. The center
        // view + side tabs swap based on layoutMode (intervention vs map).
        <Group orientation="horizontal" className="flex min-h-0 flex-1">
          <Panel defaultSize="22" minSize="14" maxSize="34" className="min-h-0">
            <SessionPanel />
          </Panel>
          <Separator className={HANDLE} />
          <Panel minSize="30" className="min-h-0">
            {centerView}
          </Panel>
          <Separator className={HANDLE} />
          <Panel defaultSize="30" minSize="18" maxSize="44" className="min-h-0">
            <RightPanel tabs={sideTabs} />
          </Panel>
        </Group>
      ) : (
        // Mobile: single pane at a time (layout-independent). The flow and the
        // node details are separate tabs, so both main views are reachable.
        <>
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            {tab("session", "Session")}
            {tab("flow", "Flow")}
            {tab("panel", "Details")}
          </div>
          <div className="min-h-0 flex-1">
            <div className={`h-full ${view === "session" ? "block" : "hidden"}`}>
              <SessionPanel />
            </div>
            <div className={`h-full ${view === "flow" ? "block" : "hidden"}`}>
              <AnchorCanvas />
            </div>
            <div className={`h-full ${view === "panel" ? "block" : "hidden"}`}>
              <RightPanel tabs={["details", "anchors"]} />
            </div>
          </div>
        </>
      )}
    </main>
  );
}

export default function McpViewPage() {
  return (
    <Suspense fallback={<div className="h-dvh bg-slate-50 dark:bg-slate-950" />}>
      <McpView />
    </Suspense>
  );
}

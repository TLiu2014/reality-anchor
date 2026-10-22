"use client";

import { useEffect, useRef, useState } from "react";
import {
  useAnchorStore,
  type LayoutMode,
  type UiLayout,
} from "@/store/useAnchorStore";
import { isAiConnected, type BedrockCreds, type FallbackMode } from "@/lib/byok";

const FALLBACK_OPTIONS: { value: FallbackMode; label: string; hint: string }[] = [
  {
    value: "heuristic",
    label: "Heuristic (offline, default)",
    hint: "A built-in script calls the real MCP tools, so it works without a key.",
  },
  {
    value: "alert",
    label: "Require a key",
    hint: "Don't run anything; ask for a Bedrock key first.",
  },
];

const LAYOUT_OPTIONS: { value: UiLayout; label: string; hint: string }[] = [
  {
    value: "chat",
    label: "Unified chat",
    hint: "Chat beside a flow and anchors card after the first turn",
  },
  {
    value: "split",
    label: "Three panes",
    hint: "Session, center view, and side panel side by side",
  },
];

const CENTER_OPTIONS: { value: LayoutMode; label: string; hint: string }[] = [
  {
    value: "intervention",
    label: "Intervention first",
    hint: "Node details in the center; flow map on the side",
  },
  {
    value: "map",
    label: "Flow map first",
    hint: "Flow diagram in the center; node details on the side",
  },
];

function GearIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

const FIELD =
  "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
const LABEL = "mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400";

export function SettingsMenu() {
  const bedrock = useAnchorStore((s) => s.bedrock);
  const setBedrock = useAnchorStore((s) => s.setBedrock);
  const fallbackMode = useAnchorStore((s) => s.fallbackMode);
  const setFallbackMode = useAnchorStore((s) => s.setFallbackMode);
  const uiLayout = useAnchorStore((s) => s.uiLayout);
  const setUiLayout = useAnchorStore((s) => s.setUiLayout);
  const layoutMode = useAnchorStore((s) => s.layoutMode);
  const setLayoutMode = useAnchorStore((s) => s.setLayoutMode);
  const hydrateSettings = useAnchorStore((s) => s.hydrateSettings);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BedrockCreds>({});
  const [showIam, setShowIam] = useState(false);
  const [saved, setSaved] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    hydrateSettings();
  }, [hydrateSettings]);

  // Sync the form from the store each time the dropdown opens.
  useEffect(() => {
    if (open) {
      setForm(bedrock ?? {});
      setShowIam(Boolean(bedrock?.accessKeyId || bedrock?.secretAccessKey));
      setSaved(false);
    }
  }, [open, bedrock]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const connected = isAiConnected(form);

  const update = (patch: Partial<BedrockCreds>) =>
    setForm((f) => ({ ...f, ...patch }));

  const save = () => {
    setBedrock(form);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  const clear = () => {
    setBedrock(null);
    setForm({});
    setShowIam(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Settings"
        aria-expanded={open}
        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        <GearIcon />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 max-h-[85vh] w-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold">Model settings</h3>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.7rem] font-medium ${
                connected
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-slate-400"}`}
              />
              {connected ? "Bedrock connected" : "Not connected"}
            </span>
          </div>

          <section className="space-y-2.5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Amazon Bedrock · your key
              </p>
              <p className="mt-0.5 text-[0.72rem] leading-snug text-slate-500 dark:text-slate-400">
                Paste a Bedrock key to drive the agent with a real model. Stored
                only in this browser.
              </p>
            </div>

            <div>
              <label className={LABEL} htmlFor="ra-region">
                Region
              </label>
              <input
                id="ra-region"
                className={FIELD}
                placeholder="us-west-2"
                value={form.region ?? ""}
                onChange={(e) => update({ region: e.target.value })}
              />
            </div>

            <div>
              <label className={LABEL} htmlFor="ra-apikey">
                Bedrock API key
              </label>
              <input
                id="ra-apikey"
                type="password"
                className={FIELD}
                placeholder="bedrock-api-key…"
                value={form.apiKey ?? ""}
                onChange={(e) => update({ apiKey: e.target.value })}
              />
            </div>

            <button
              type="button"
              onClick={() => setShowIam((s) => !s)}
              className="text-[0.72rem] font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              {showIam ? "Hide IAM access key" : "Use IAM access key instead"}
            </button>

            {showIam && (
              <div className="space-y-2.5 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-900/60">
                <input
                  type="password"
                  className={FIELD}
                  placeholder="AWS_ACCESS_KEY_ID"
                  value={form.accessKeyId ?? ""}
                  onChange={(e) => update({ accessKeyId: e.target.value })}
                />
                <input
                  type="password"
                  className={FIELD}
                  placeholder="AWS_SECRET_ACCESS_KEY"
                  value={form.secretAccessKey ?? ""}
                  onChange={(e) => update({ secretAccessKey: e.target.value })}
                />
                <input
                  type="password"
                  className={FIELD}
                  placeholder="AWS_SESSION_TOKEN (optional)"
                  value={form.sessionToken ?? ""}
                  onChange={(e) => update({ sessionToken: e.target.value })}
                />
              </div>
            )}

            <div className="flex gap-2 pt-0.5">
              <button
                type="button"
                onClick={save}
                className="flex-1 rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-bold text-white transition hover:bg-indigo-400"
              >
                {saved ? "Saved ✓" : "Save key"}
              </button>
              <button
                type="button"
                onClick={clear}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Clear
              </button>
            </div>
          </section>

          <section className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              When no AI key is set
            </p>
            <div className="mt-2 space-y-1.5">
              {FALLBACK_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer gap-2.5 rounded-lg border p-2 transition ${
                    fallbackMode === opt.value
                      ? "border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-950/40"
                      : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="ra-fallback"
                    className="mt-0.5"
                    checked={fallbackMode === opt.value}
                    onChange={() => setFallbackMode(opt.value)}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
                      {opt.label}
                    </span>
                    <span className="block text-[0.72rem] leading-snug text-slate-500 dark:text-slate-400">
                      {opt.hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Layout
            </p>
            <div className="mt-2 space-y-1.5">
              {LAYOUT_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer gap-2.5 rounded-lg border p-2 transition ${
                    uiLayout === opt.value
                      ? "border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-950/40"
                      : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="ra-layout"
                    className="mt-0.5"
                    checked={uiLayout === opt.value}
                    onChange={() => setUiLayout(opt.value)}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
                      {opt.label}
                    </span>
                    <span className="block text-[0.72rem] leading-snug text-slate-500 dark:text-slate-400">
                      {opt.hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            {uiLayout === "split" && (
              <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Center view
                </p>
                <div className="space-y-1.5">
                  {CENTER_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer gap-2.5 rounded-lg border p-2 transition ${
                        layoutMode === opt.value
                          ? "border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-950/40"
                          : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="ra-center"
                        className="mt-0.5"
                        checked={layoutMode === opt.value}
                        onChange={() => setLayoutMode(opt.value)}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
                          {opt.label}
                        </span>
                        <span className="block text-[0.72rem] leading-snug text-slate-500 dark:text-slate-400">
                          {opt.hint}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

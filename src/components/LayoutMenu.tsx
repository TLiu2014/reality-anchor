"use client";

import { useEffect, useRef, useState } from "react";
import { useAnchorStore, type LayoutMode } from "@/store/useAnchorStore";

const OPTIONS: { value: LayoutMode; label: string; hint: string }[] = [
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

/** Gear dropdown for the layout setting (which main view is the center). */
export function LayoutMenu() {
  const layoutMode = useAnchorStore((s) => s.layoutMode);
  const setLayoutMode = useAnchorStore((s) => s.setLayoutMode);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Layout settings"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-2 px-1 text-xs font-bold uppercase tracking-widest text-slate-400">
            Layout — center view
          </p>
          <div className="space-y-1">
            {OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <input
                  type="radio"
                  name="layout-mode"
                  className="mt-0.5 accent-indigo-600"
                  checked={layoutMode === opt.value}
                  onChange={() => setLayoutMode(opt.value)}
                />
                <span>
                  <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
                    {opt.label}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {opt.hint}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

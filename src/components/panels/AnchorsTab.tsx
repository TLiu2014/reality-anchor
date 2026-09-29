"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_ANCHORS,
  effectiveAnchors,
  useAnchorStore,
} from "@/store/useAnchorStore";

/**
 * Anchors editor. Anchors are the user's calm-state reality rules. They're
 * client-editable (persisted to localStorage) and feed the local analysis
 * (matchRule). The get_baseline_rules MCP tool still serves the server-side
 * defaults to Alexa+.
 */
export function AnchorsTab() {
  const anchors = useAnchorStore((s) => s.anchors);
  const anchorsCustomized = useAnchorStore((s) => s.anchorsCustomized);
  const setAnchors = useAnchorStore((s) => s.setAnchors);
  const resetAnchors = useAnchorStore((s) => s.resetAnchors);

  const active = useMemo(
    () => effectiveAnchors({ anchors, anchorsCustomized }),
    [anchors, anchorsCustomized]
  );

  const [text, setText] = useState(active.join("\n"));
  const [flash, setFlash] = useState(false);

  // Keep the textarea in sync when the store changes (e.g. reset to defaults).
  useEffect(() => {
    setText(active.join("\n"));
  }, [active]);

  const dirty = text !== active.join("\n");

  const save = () => {
    setAnchors(text.split("\n"));
    setFlash(true);
    setTimeout(() => setFlash(false), 2500);
  };

  return (
    <div className="flex h-full min-h-0 flex-col p-4">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold">Your anchors</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            In use now · {anchorsCustomized ? `${active.length} custom` : "defaults"}
          </p>
        </div>
        {anchorsCustomized && (
          <button
            type="button"
            onClick={resetAnchors}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Reset
          </button>
        )}
      </div>

      <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
        One anchor per line — short, calm-state truths your looping self can be
        grounded against.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        className="min-h-0 flex-1 resize-none rounded-lg border border-slate-300 bg-white p-3 font-mono text-sm leading-relaxed text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="text-xs">
          {flash ? (
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              Saved ✓
            </span>
          ) : dirty ? (
            <span className="text-amber-600 dark:text-amber-400">
              Unsaved changes
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setText(DEFAULT_ANCHORS.join("\n"))}
              className="text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Load examples
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!dirty}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-400 disabled:opacity-40"
        >
          Save anchors
        </button>
      </div>
    </div>
  );
}

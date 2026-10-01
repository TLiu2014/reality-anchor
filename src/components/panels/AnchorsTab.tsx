"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { getBaselineRulesForUser } from "@/lib/mcp/baselineRules";
import {
  DEFAULT_ANCHORS,
  effectiveAnchors,
  useAnchorStore,
} from "@/store/useAnchorStore";

/**
 * Anchors library. Each calm-state truth is its own card. Edits stay in a
 * draft until Save; the saved set feeds local analysis (matchRule). The
 * get_baseline_rules MCP tool still serves the server-side defaults to Alexa+.
 */

interface Draft {
  id: string;
  text: string;
}

interface ThemeStyle {
  label: string;
  /** Top-edge color. Inline so dark-mode border utilities cannot cover it. */
  edge: string;
  chip: string;
}

const THEME_BY_RULE = new Map(
  getBaselineRulesForUser("demo-user").map((rule) => [rule.rule, rule.theme])
);

const THEMES: Record<string, ThemeStyle> = {
  checking: {
    label: "Checking",
    edge: "#818cf8",
    chip: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200",
  },
  contamination: {
    label: "Contamination",
    edge: "#06b6d4",
    chip: "bg-cyan-50 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-200",
  },
  safety: {
    label: "Safety",
    edge: "#fbbf24",
    chip: "bg-amber-50 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200",
  },
  harm: {
    label: "Harm",
    edge: "#fb7185",
    chip: "bg-rose-50 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200",
  },
  general: {
    label: "General",
    edge: "#34d399",
    chip: "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200",
  },
};

const YOURS: ThemeStyle = {
  label: "Yours",
  edge: "#a78bfa",
  chip: "bg-violet-50 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200",
};

const FRESH: ThemeStyle = {
  label: "New",
  edge: "#94a3b8",
  chip: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300",
};

function styleFor(text: string): ThemeStyle {
  const trimmed = text.trim();
  if (!trimmed) return FRESH;
  const theme = THEME_BY_RULE.get(trimmed);
  return (theme && THEMES[theme]) || YOURS;
}

/** Stable ids for store-backed lines so server and client markup match. */
function draftsFrom(lines: string[]): Draft[] {
  return lines.map((text, index) => ({ id: `saved-${index}`, text }));
}

function joinDrafts(drafts: Draft[]): string {
  return drafts.map((draft) => draft.text).join("\n");
}

let localSeq = 0;
function nextLocalId(): string {
  localSeq += 1;
  return `local-${localSeq}`;
}

function linesFromPaste(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function AnchorsTab() {
  const anchors = useAnchorStore((s) => s.anchors);
  const anchorsCustomized = useAnchorStore((s) => s.anchorsCustomized);
  const setAnchors = useAnchorStore((s) => s.setAnchors);
  const resetAnchors = useAnchorStore((s) => s.resetAnchors);

  const active = effectiveAnchors({ anchors, anchorsCustomized });
  const activeKey = active.join("\n");

  const [drafts, setDrafts] = useState<Draft[]>(() => draftsFrom(active));
  const [flash, setFlash] = useState(false);
  const focusId = useRef<string | null>(null);
  const flashTimer = useRef<number | null>(null);

  // Replace the draft when the saved set changes (reset, hydrate, save).
  useEffect(() => {
    setDrafts((prev) =>
      joinDrafts(prev) === activeKey ? prev : draftsFrom(active)
    );
  }, [active, activeKey]);

  useEffect(() => {
    return () => {
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    };
  }, []);

  useLayoutEffect(() => {
    const id = focusId.current;
    if (!id) return;
    const el = document.getElementById(`anchor-text-${id}`);
    if (!(el instanceof HTMLTextAreaElement)) return;
    el.focus();
    el.scrollIntoView({ block: "nearest" });
    focusId.current = null;
  }, [drafts]);

  const dirty = joinDrafts(drafts) !== activeKey;
  const filled = drafts.filter((draft) => draft.text.trim()).length;

  const save = () => {
    const lines = drafts.map((draft) => draft.text);
    const hasText = lines.some((line) => line.trim());
    if (hasText) setAnchors(lines);
    else resetAnchors();
    setFlash(true);
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(false), 2500);
  };

  const addAnchor = () => {
    const id = nextLocalId();
    focusId.current = id;
    setDrafts((prev) => [...prev, { id, text: "" }]);
  };

  const updateAnchor = (id: string, text: string) => {
    setDrafts((prev) =>
      prev.map((draft) => (draft.id === id ? { ...draft, text } : draft))
    );
  };

  const removeAnchor = (id: string) => {
    setDrafts((prev) => prev.filter((draft) => draft.id !== id));
  };

  const insertLines = (id: string, lines: string[], mode: "replace" | "after") => {
    setDrafts((prev) => {
      const index = prev.findIndex((draft) => draft.id === id);
      if (index < 0 || lines.length === 0) return prev;
      if (mode === "after") {
        const created = lines.map((text) => ({ id: nextLocalId(), text }));
        focusId.current = created[created.length - 1].id;
        return [
          ...prev.slice(0, index + 1),
          ...created,
          ...prev.slice(index + 1),
        ];
      }
      const [first, ...rest] = lines;
      const created = [
        { id, text: first },
        ...rest.map((text) => ({ id: nextLocalId(), text })),
      ];
      focusId.current = created[created.length - 1].id;
      return [...prev.slice(0, index), ...created, ...prev.slice(index + 1)];
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-4 pb-3 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold">Your anchors</h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {anchorsCustomized ? "Your set" : "Built-in set"}
              {" · "}
              {filled} {filled === 1 ? "anchor" : "anchors"}
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
        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Calm-state truths read back when a loop starts. Each card is one
          anchor.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3 pt-1">
        {drafts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center dark:border-slate-700">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              No anchors in this draft
            </p>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Add one of your own, or load the examples. Until you save a set,
              the built-in anchors stay in use.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5" aria-label="Anchors">
            {drafts.map((draft) => (
              <AnchorCard
                key={draft.id}
                draft={draft}
                onChange={(text) => updateAnchor(draft.id, text)}
                onRemove={() => removeAnchor(draft.id)}
                onPasteLines={(lines, mode) => insertLines(draft.id, lines, mode)}
                onSave={save}
                canSave={dirty}
              />
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={addAnchor}
          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-200"
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
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add an anchor
        </button>
      </div>

      <div className="relative z-10 flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="text-xs" aria-live="polite">
          {flash ? (
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              Saved
            </span>
          ) : dirty ? (
            <span className="text-amber-600 dark:text-amber-400">
              Unsaved changes
            </span>
          ) : anchorsCustomized ? (
            <button
              type="button"
              onClick={() => setDrafts(draftsFrom(DEFAULT_ANCHORS))}
              className="text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Load examples
            </button>
          ) : (
            <span className="text-slate-400">Examples in use</span>
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

function AnchorCard({
  draft,
  onChange,
  onRemove,
  onPasteLines,
  onSave,
  canSave,
}: {
  draft: Draft;
  onChange: (text: string) => void;
  onRemove: () => void;
  onPasteLines: (lines: string[], mode: "replace" | "after") => void;
  onSave: () => void;
  canSave: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const style = styleFor(draft.text);
  const label = draft.text.trim().slice(0, 80);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft.text]);

  return (
    <li
      className={[
        "rounded-xl border border-t-[3px] border-slate-200 bg-white shadow-sm transition",
        "focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500/20",
        "dark:border-slate-800 dark:bg-slate-900 dark:focus-within:border-indigo-700",
      ].join(" ")}
      style={{ borderTopColor: style.edge }}
    >
      <div className="flex items-center justify-between gap-2 px-3 pb-1 pt-2.5">
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.chip}`}
        >
          {style.label}
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={label ? `Remove anchor: ${label}` : "Remove empty anchor"}
          className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="h-3.5 w-3.5"
            aria-hidden
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <textarea
        id={`anchor-text-${draft.id}`}
        ref={ref}
        value={draft.text}
        rows={2}
        spellCheck
        placeholder="A short truth you trust when you are calm."
        aria-label={label ? `Anchor: ${label}` : "New anchor"}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && canSave) {
            event.preventDefault();
            onSave();
          }
        }}
        onPaste={(event) => {
          const lines = linesFromPaste(event.clipboardData.getData("text"));
          if (lines.length < 2) return;
          const el = event.currentTarget;
          const allSelected =
            el.selectionStart === 0 && el.selectionEnd === el.value.length;
          event.preventDefault();
          onPasteLines(lines, el.value.trim() && !allSelected ? "after" : "replace");
        }}
        className="min-h-[3.25rem] w-full resize-none overflow-hidden bg-transparent px-3 pb-3 text-sm leading-6 text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
      />
    </li>
  );
}

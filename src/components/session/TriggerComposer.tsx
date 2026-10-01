"use client";

import { useState } from "react";
import { useAnchorStore } from "@/store/useAnchorStore";

/** Shared "simulate a trigger" form for the session pane and the chat view. */
export function TriggerComposer({ className }: { className?: string }) {
  const addTurn = useAnchorStore((s) => s.addTurn);
  const [text, setText] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const value = text.trim();
        if (!value) return;
        addTurn(value);
        setText("");
      }}
      className={className}
    >
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Simulate a trigger
      </p>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe the worry or urge…"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="shrink-0 rounded-lg bg-indigo-500 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-indigo-400 disabled:opacity-40"
        >
          Anchor
        </button>
      </div>
    </form>
  );
}

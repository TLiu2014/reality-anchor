"use client";

import { useAnchorStore } from "@/store/useAnchorStore";

/** Prominent "start over" action, so it's obvious how to begin a new test. */
export function NewChatButton() {
  const reset = useAnchorStore((s) => s.reset);

  return (
    <button
      type="button"
      onClick={reset}
      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="h-4 w-4"
        aria-hidden
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
      New chat
    </button>
  );
}

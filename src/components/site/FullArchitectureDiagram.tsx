"use client";

import { useEffect, useState } from "react";

// The full architecture diagram image. Generate it from the Mermaid source in
// `src/lib/architectureMermaid.ts` (e.g. mermaid.live → export PNG/SVG) and drop
// it in `public/` — replace this placeholder or point this at your file.
const DIAGRAM_SRC = "/architecture.svg";

/**
 * Collapsed-by-default full architecture diagram (static image). Expand via the
 * native <details>; click the image to open a full-screen lightbox (Esc / click
 * outside / ✕ to close).
 */
export function FullArchitectureDiagram() {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomed(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [zoomed]);

  return (
    <>
      <details className="group mt-6 rounded-xl border border-slate-200 bg-white/60 dark:border-slate-800 dark:bg-slate-900/40">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200">
          <span className="inline-flex items-center gap-2">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-indigo-500"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <path d="M7 10v4a2 2 0 0 0 2 2h5" />
            </svg>
            Full system diagram
          </span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>
        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setZoomed(true)}
            title="Click to view full size"
            className="block w-full cursor-zoom-in overflow-hidden rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={DIAGRAM_SRC}
              alt="RealityAnchor system architecture diagram"
              className="mx-auto h-auto w-full"
            />
          </button>
          <p className="mt-2 text-xs text-slate-400">
            Click the diagram to view it full size.
          </p>
        </div>
      </details>

      {zoomed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Full-size architecture diagram"
          onClick={() => setZoomed(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <button
            type="button"
            aria-label="Close full-size diagram"
            onClick={() => setZoomed(false)}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[92vh] max-w-[95vw] cursor-default items-center justify-center rounded-lg bg-white p-4 shadow-2xl dark:bg-slate-950"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={DIAGRAM_SRC}
              alt="RealityAnchor system architecture diagram, full size"
              className="max-h-[calc(92vh-2rem)] max-w-full object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}

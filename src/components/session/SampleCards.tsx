"use client";

interface Sample {
  id: string;
  emoji: string;
  title: string;
  prompt: string;
}

const SAMPLES: Sample[] = [
  {
    id: "checking",
    emoji: "🔒",
    title: "Checking urge · you decide",
    prompt:
      "I already locked the front door — but what if I didn't, and the house burns down?",
  },
  {
    id: "contamination",
    emoji: "🧼",
    title: "Contamination · anchor settles it",
    prompt:
      "My hands feel contaminated, but they look completely clean and I haven't touched anything dirty.",
  },
  {
    id: "genuine-risk",
    emoji: "⚠️",
    title: "A real safety signal",
    prompt: "I can smell gas — I think the stove is actually on.",
  },
];

/** Suggestion cards for the empty session / chat transcript. */
export function SampleCards({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Try an example
      </p>
      <div className="flex flex-col gap-2">
        {SAMPLES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onPick(s.prompt)}
            className="group flex flex-col gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/30"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                <span className="text-base">{s.emoji}</span>
                {s.title}
              </span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-indigo-500"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </div>
            <span className="line-clamp-2 text-xs leading-snug text-slate-500 dark:text-slate-400">
              &ldquo;{s.prompt}&rdquo;
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

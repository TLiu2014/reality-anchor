import Link from "next/link";
import { SiteNav, SiteFooter } from "@/components/site/SiteChrome";

const TOOLS = [
  {
    name: "get_baseline_rules",
    blurb:
      "Reads the user's pre-committed calm-state anchors back to them, so Alexa+ grounds them in their own words instead of improvising reassurance.",
  },
  {
    name: "evaluate_cognitive_distortion",
    blurb:
      "Classifies a spoken or typed trigger against common CBT distortions, rates the risk, and flags genuine safety signals that are NOT the loop.",
  },
  {
    name: "trigger_erp_delay",
    blurb:
      "Starts a Human-in-the-Loop ERP delay — the user urge-surfs for N minutes before acting on a compulsion.",
  },
];

const STEPS = [
  "Alexa+ hears the worry",
  "It calls RealityAnchor's tools",
  "The grounding view renders in chat",
  "The user waits out the urge",
];

export default function Home() {
  return (
    <div className="min-h-dvh bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <SiteNav active="home" />

      <main className="mx-auto max-w-6xl px-5">
        {/* Hero */}
        <section className="py-20 text-center">
          <p className="inline-block rounded-full bg-indigo-500/10 px-3 py-1 text-sm font-medium text-indigo-600 dark:text-indigo-300">
            Alexa+ MCP Add-on
          </p>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            A reality anchor for{" "}
            <span className="bg-gradient-to-br from-indigo-500 to-violet-500 bg-clip-text text-transparent">
              OCD & cognitive loops
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            RealityAnchor gives Alexa+ the tools to break a spiral with the
            user&apos;s own calm-state rules — by voice on an Echo, or as a visual
            grounding view in the Alexa app.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/mcp-view"
              className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              Open the app
            </Link>
            <Link
              href="/docs"
              className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Read the docs
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-slate-200 py-14 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-3">
                <span className="rounded-full border border-slate-200 px-4 py-2 font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                  {s}
                </span>
                {i < STEPS.length - 1 && (
                  <span className="text-slate-400">→</span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Tools */}
        <section className="py-14">
          <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-slate-400">
            The MCP tools
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {TOOLS.map((t) => (
              <div
                key={t.name}
                className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800"
              >
                <code className="font-mono text-sm font-semibold text-indigo-600 dark:text-indigo-300">
                  {t.name}
                </code>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {t.blurb}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl bg-slate-50 p-5 text-center dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              MCP endpoint (Streamable HTTP)
            </p>
            <code className="mt-1 block font-mono text-sm">POST /api/mcp</code>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

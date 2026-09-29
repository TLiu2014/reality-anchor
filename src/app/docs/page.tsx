import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav, SiteFooter } from "@/components/site/SiteChrome";
import { DocsToc, type TocItem } from "@/components/site/DocsToc";
import { ArchitectureDiagram } from "@/components/site/ArchitectureDiagram";
import { FullArchitectureDiagram } from "@/components/site/FullArchitectureDiagram";

export const metadata: Metadata = {
  title: "RealityAnchor — docs",
  description:
    "How RealityAnchor works as an Alexa+ MCP add-on: the MCP server, tools, the visual flow, ERP delays, anchors, and how the AI fits in.",
};

const SECTIONS: TocItem[] = [
  { id: "overview", label: "Overview" },
  { id: "architecture", label: "Architecture" },
  { id: "how-ai-works", label: "How the AI works" },
  { id: "tools", label: "MCP tools" },
  { id: "flow", label: "The visual flow" },
  { id: "erp", label: "ERP delay & HITL" },
  { id: "anchors", label: "Anchors" },
  { id: "running", label: "Running & testing" },
];

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="scroll-mt-24 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50"
    >
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-300">
      {children}
    </p>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-800 dark:bg-slate-800 dark:text-slate-100">
      {children}
    </code>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-dvh bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <SiteNav active="docs" />

      <div className="mx-auto flex max-w-6xl gap-10 px-5 py-12">
        <aside className="sticky top-24 hidden h-max w-56 shrink-0 lg:block">
          <p className="mb-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-400">
            On this page
          </p>
          <DocsToc items={SECTIONS} />
        </aside>

        <main className="min-w-0 max-w-3xl space-y-14">
          <section>
            <H2 id="overview">Overview</H2>
            <P>
              RealityAnchor is a grounding companion for OCD and cognitive loops,
              delivered as an <strong>Alexa+ MCP add-on</strong>. When a user is
              spiralling, Alexa+ calls RealityAnchor&apos;s tools to name the
              distortion, read the user&apos;s own calm-state rules back to them,
              and start an ERP (Exposure &amp; Response Prevention) delay. The
              visual view renders the intervention in the chat surface.
            </P>
          </section>

          <section>
            <H2 id="architecture">Architecture</H2>
            <P>
              There are two surfaces, both served from one Next.js app:
            </P>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-600 dark:text-slate-300">
              <li>
                <Code>/api/mcp</Code> — the <strong>MCP server</strong> (Streamable
                HTTP) the AI connects to. It exposes machine-readable tools.
              </li>
              <li>
                <Code>/mcp-view</Code> — the <strong>MCP App</strong>: the visual
                grounding UI, hydrated from the tool context Alexa+ passes.
              </li>
            </ul>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-900/40">
              <ArchitectureDiagram />
            </div>

            <FullArchitectureDiagram />
          </section>

          <section>
            <H2 id="how-ai-works">How the AI works</H2>
            <P>
              Two layers of intelligence.{" "}
              <strong>Alexa+ is the orchestrator</strong> — it reads the
              plain-English descriptions of our MCP tools and decides which to
              call during the conversation, then writes the spoken/typed
              response. That&apos;s the point of an add-on: the conversation lives
              in Alexa+, not in a competing in-app chatbot.
            </P>
            <P>
              <strong>The analysis itself is model-generated.</strong> When you
              call <Code>evaluate_cognitive_distortion</Code>, the tool calls a
              real model (first-party Claude API, or Claude via Amazon Bedrock)
              to classify the distortion, rate the risk, and write the rationale
              and suggested response — this is what fills the node details. The
              keyword heuristic is only a <em>fallback</em> for local dev and
              testing when no model credentials are configured. Each analysis is
              tagged <Code>AI</Code> or <Code>heuristic</Code> in the UI so you
              can see which path ran.
            </P>
            <P>
              The in-app <Code>Simulate a trigger</Code> control runs the same
              path through <Code>/api/analyze</Code> — real model when
              configured, heuristic otherwise — so a standalone demo shows real
              model output the moment a key is set.
            </P>
          </section>

          <section>
            <H2 id="tools">MCP tools</H2>
            <ul className="mt-3 space-y-3 text-slate-600 dark:text-slate-300">
              <li>
                <Code>get_baseline_rules</Code> — returns the user&apos;s
                calm-state anchors so Alexa+ can read their own words back.
              </li>
              <li>
                <Code>evaluate_cognitive_distortion</Code> — classifies a trigger
                against CBT distortions, rates risk, and flags genuine safety
                signals that are <em>not</em> the loop.
              </li>
              <li>
                <Code>trigger_erp_delay</Code> — starts a Human-in-the-Loop delay
                the user urge-surfs before acting on a compulsion.
              </li>
            </ul>
          </section>

          <section>
            <H2 id="flow">The visual flow</H2>
            <P>
              Each turn draws a lane: a gray <strong>Trigger</strong> node → a
              blue <strong>Analysis</strong> node (distortion, risk, and the
              matched anchor) → a yellow <strong>ERP Delay</strong> node with a
              countdown. A continued conversation appends new lanes rather than
              wiping the diagram, so the whole session stays visible. Click any
              node or trace chip to see its details.
            </P>
          </section>

          <section>
            <H2 id="erp">ERP delay &amp; HITL</H2>
            <P>
              The ERP node shows a large countdown. When the user clicks{" "}
              <Code>I waited it out</Code>, the app POSTs to{" "}
              <Code>/api/resume-session</Code> — the Human-in-the-Loop callback
              that closes the loop — and the node flips to a green{" "}
              <strong>Resolved</strong> state. A genuine safety signal (e.g. a real
              gas smell) never gets a delay; it tells the user to act.
            </P>
          </section>

          <section>
            <H2 id="anchors">Anchors</H2>
            <P>
              Anchors are the user&apos;s calm-state reality rules. In the app they
              are client-editable (the <strong>Anchors</strong> tab, persisted
              locally) and feed the local analysis. The{" "}
              <Code>get_baseline_rules</Code> tool serves server-side defaults to
              Alexa+.
            </P>
          </section>

          <section>
            <H2 id="running">Running &amp; testing</H2>
            <P>
              Run <Code>pnpm dev</Code> and open{" "}
              <Link
                href="/mcp-view"
                className="text-indigo-600 hover:underline dark:text-indigo-300"
              >
                /mcp-view
              </Link>
              . Point an MCP client (MCP Inspector, Claude Code/Desktop) at{" "}
              <Code>/api/mcp</Code> over Streamable HTTP to exercise the tools as
              Alexa+ would. See <Code>DEPLOYMENT.md</Code> for full local + deploy
              instructions.
            </P>
          </section>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}

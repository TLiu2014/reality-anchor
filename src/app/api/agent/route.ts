/**
 * Agentic turn that genuinely exercises the MCP server.
 *
 * This is the "simulated Alexa+" brain for the in-app chat. It opens a real MCP
 * session to this app's own /api/mcp endpoint (loopback) and, per turn:
 *   - if a model is configured, runs a Claude tool-use loop where the MODEL
 *     decides which MCP tools to call (evaluate_cognitive_distortion,
 *     trigger_erp_delay, …) — exactly what Alexa+ would do;
 *   - otherwise, runs a scripted orchestration that still calls those tools over
 *     MCP, so the demo shows real MCP round-trips even with no key.
 *
 * Every tool call and result is streamed to the browser as an SSE frame, so the
 * chat can render the MCP traces and build the flow from the real tool outputs.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import { resolveModel, envProvider, type ResolvedModel } from "@/lib/mcp/model";
import { BYOK_HEADER, cleanCreds, type BedrockCreds, type FallbackMode } from "@/lib/byok";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Send = (obj: unknown) => void;

interface AgentBody {
  trigger?: string;
  anchors?: string[];
  /** BYOK creds pasted in Settings — drive the model from the browser. */
  bedrock?: BedrockCreds | null;
  /** What to do when no model is configured. */
  fallbackMode?: FallbackMode;
}

function frame(obj: unknown): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

/** Call an MCP tool and stream the call + parsed result. Returns the output. */
async function callMcp(
  client: Client,
  name: string,
  args: Record<string, unknown>,
  send: Send
): Promise<unknown> {
  send({ type: "tool_call", name, input: args });
  const res = await client.callTool({ name, arguments: args });
  const first = Array.isArray(res.content) ? res.content[0] : undefined;
  const text = first && first.type === "text" ? first.text : "";
  let output: unknown = text;
  try {
    output = JSON.parse(text);
  } catch {
    /* leave as string */
  }
  send({ type: "tool_result", name, output, isError: Boolean(res.isError) });
  return output;
}

const AGENT_SYSTEM = `You are Alexa+ using the RealityAnchor add-on to ground a user who may be in an OCD / cognitive loop. You have MCP tools. For any worry the user shares:
1. Call evaluate_cognitive_distortion with their exact words to classify it.
2. Read the result's "resolution":
   - "hitl": call trigger_erp_delay (delay_minutes 3) to hand the user a Human-in-the-Loop urge-surf delay.
   - "auto": do NOT start a delay — an anchor already settles it.
   - "genuine": do NOT start a delay — tell them to act now.
You may call get_baseline_rules to read the user's anchors.
Keep your final spoken reply to one or two warm, plain sentences. Do not invent tools.`;

/** Model-driven loop: the model decides which MCP tools to call. */
async function runModelLoop(
  client: Client,
  model: ResolvedModel,
  trigger: string,
  send: Send
): Promise<void> {
  const { tools } = await client.listTools();
  const anthropicTools = tools.map((t) => ({
    name: t.name,
    description: t.description ?? "",
    input_schema: t.inputSchema as Record<string, unknown>,
  }));

  type Msg = { role: "user" | "assistant"; content: unknown };
  const messages: Msg[] = [{ role: "user", content: trigger }];

  for (let step = 0; step < 6; step++) {
    const res = (await model.client.messages.create({
      model: model.model,
      max_tokens: 1024,
      system: AGENT_SYSTEM,
      tools: anthropicTools,
      messages,
    } as never)) as unknown as {
      content: Array<Record<string, unknown>>;
      stop_reason?: string;
    };

    const blocks = Array.isArray(res.content) ? res.content : [];
    const toolUses = blocks.filter((b) => b.type === "tool_use");
    const isTerminal = res.stop_reason !== "tool_use" || toolUses.length === 0;

    // Only surface spoken text from the terminal message, so the chat's reply
    // bubble is the final answer — not an intermediate "let me check…" aside the
    // model may emit alongside a tool call.
    if (isTerminal) {
      const reply = blocks
        .filter((b) => b.type === "text" && typeof b.text === "string")
        .map((b) => String(b.text).trim())
        .filter(Boolean)
        .join(" ");
      if (reply) send({ type: "text", text: reply });
      return;
    }

    messages.push({ role: "assistant", content: blocks });
    const toolResults: Array<Record<string, unknown>> = [];
    for (const tu of toolUses) {
      const name = String(tu.name);
      const input = (tu.input as Record<string, unknown>) ?? {};
      send({ type: "tool_call", name, input });
      const r = await client.callTool({ name, arguments: input });
      const first = Array.isArray(r.content) ? r.content[0] : undefined;
      const text = first && first.type === "text" ? first.text : "";
      let output: unknown = text;
      try {
        output = JSON.parse(text);
      } catch {
        /* string */
      }
      send({ type: "tool_result", name, output, isError: Boolean(r.isError) });
      toolResults.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: text,
        is_error: Boolean(r.isError),
      });
    }
    messages.push({ role: "user", content: toolResults });
  }
}

/** Scripted loop: no model, but still real MCP calls so traces are genuine. */
async function runScripted(
  client: Client,
  trigger: string,
  send: Send
): Promise<void> {
  const analysis = (await callMcp(
    client,
    "evaluate_cognitive_distortion",
    { trigger_event: trigger },
    send
  )) as {
    resolution?: string;
    genuine_risk_signal?: boolean;
    distortion?: string;
    suggested_response?: string;
  } | null;

  const resolution = analysis?.resolution;
  if (analysis && resolution === "hitl") {
    await callMcp(client, "trigger_erp_delay", { delay_minutes: 3 }, send);
  }

  const reply =
    resolution === "genuine"
      ? "This reads as real evidence, not the loop — act now."
      : resolution === "auto"
        ? "Your anchor already settles this — no action needed."
        : "Let's hold a short delay and sit with the uncertainty.";
  send({ type: "text", text: reply });
}

export async function POST(req: Request): Promise<Response> {
  let body: AgentBody = {};
  try {
    body = (await req.json()) as AgentBody;
  } catch {
    /* empty */
  }
  const trigger = String(body.trigger ?? "").trim();
  const creds = cleanCreds(body.bedrock ?? null);
  const fallbackMode: FallbackMode = body.fallbackMode === "alert" ? "alert" : "heuristic";
  const mcpUrl = new URL("/api/mcp", new URL(req.url).origin);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const send: Send = (o) => controller.enqueue(enc.encode(frame(o)));
      const client = new Client({
        name: "reality-anchor-agent",
        version: "0.1.0",
      });

      if (!trigger) {
        send({ type: "error", error: "trigger required" });
        send({ type: "done" });
        controller.close();
        return;
      }

      const model = resolveModel(creds);

      // No model configured and the user chose to be alerted rather than fall
      // back to the offline heuristic — block and tell them to connect a key.
      if (!model && fallbackMode === "alert") {
        send({
          type: "error",
          code: "not_connected",
          error:
            "No AI connected. Add your Amazon Bedrock key in Settings, or switch the fallback to Heuristic mode.",
        });
        send({ type: "done" });
        controller.close();
        return;
      }

      try {
        // Forward BYOK creds to the loopback MCP server so the tools' own model
        // calls (evaluate_cognitive_distortion) use the same key.
        await client.connect(
          new StreamableHTTPClientTransport(mcpUrl, {
            requestInit: creds
              ? { headers: { [BYOK_HEADER]: JSON.stringify(creds) } }
              : undefined,
          })
        );
        send({ type: "start", mode: model ? "model" : "scripted" });
        if (model) {
          try {
            await runModelLoop(client, model, trigger, send);
          } catch (err) {
            // Model loop failed — degrade to scripted so the demo still runs,
            // and the MCP calls stay real.
            send({
              type: "notice",
              text: `model loop error: ${err instanceof Error ? err.message : String(err)}`,
            });
            await runScripted(client, trigger, send);
          }
        } else {
          await runScripted(client, trigger, send);
        }
      } catch (err) {
        send({
          type: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        send({ type: "done" });
        try {
          await client.close();
        } catch {
          /* ignore */
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

/**
 * Status probe for the nav pill: reports which provider (if any) the SERVER env
 * is configured with. The client combines this with its own BYOK creds to decide
 * whether to show "connected".
 */
export function GET(): Response {
  const provider = envProvider();
  return Response.json({ provider, defaultModel: provider ?? "heuristic" });
}

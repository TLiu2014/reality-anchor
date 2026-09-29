/**
 * Real-model backing for RealityAnchor's analysis.
 *
 * In production the MCP tools are called by a real model (Alexa+), and the
 * analysis they return should itself be model-generated — not a regex. This
 * module calls Claude to produce the cognitive-distortion analysis that drives
 * the flow and node details. The keyword heuristic in `distortions.ts` is the
 * fallback for local dev / testing (and offline demos) when no model is
 * configured.
 *
 * Provider resolution (first match wins):
 *   1. ANTHROPIC_API_KEY set          → first-party Claude API
 *   2. AWS creds set                  → Claude via Amazon Bedrock (on-theme
 *                                        for the Alexa+ / Amazon track)
 *   3. neither                        → null (caller uses the heuristic)
 */

import Anthropic from "@anthropic-ai/sdk";
import { AnthropicBedrockMantle } from "@anthropic-ai/bedrock-sdk";

import type { DistortionAnalysis, RiskLevel, Resolution } from "./distortions";

type ModelClient = Pick<Anthropic, "messages">;

interface ResolvedModel {
  client: ModelClient;
  model: string;
  provider: "anthropic" | "bedrock";
}

/** Resolve a model client from the environment, or null if none is configured. */
function resolveModel(): ResolvedModel | null {
  const override = process.env.REALITY_ANCHOR_MODEL;

  if (process.env.ANTHROPIC_API_KEY) {
    return {
      client: new Anthropic(),
      model: override || "claude-opus-4-8",
      provider: "anthropic",
    };
  }

  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    const awsRegion = process.env.AWS_REGION || "us-west-2";
    return {
      // Mantle = the Messages-API Bedrock endpoint. Reads AWS creds from the
      // standard credential chain (env vars here).
      client: new AnthropicBedrockMantle({ awsRegion }) as unknown as ModelClient,
      // Bedrock model IDs take an `anthropic.` prefix.
      model: override || "anthropic.claude-opus-4-8",
      provider: "bedrock",
    };
  }

  return null;
}

/** True when a real model is configured (used to report which path ran). */
export function isModelConfigured(): boolean {
  return resolveModel() !== null;
}

const SYSTEM_PROMPT = `You are RealityAnchor's clinical analysis engine for OCD and cognitive loops. You receive a "trigger" — a worry the user spoke or typed — and classify it for a grounding assistant.

Return, via the structured output schema:
- distortion: the CBT cognitive distortion at play (e.g. "Catastrophizing", "Emotional reasoning", "Doubt / need for certainty"), or "None — genuine safety signal" when it is not the loop.
- risk: "low" | "medium" | "high" — the intensity/urgency of the loop.
- rationale: one or two sentences naming why this is a thinking trap, in plain, compassionate language.
- suggested_response: what the assistant should do next (usually: name it, then offer an ERP delay to urge-surf).
- genuine_risk_signal: true ONLY when the trigger reflects real, new sensory evidence of danger (smelling gas, seeing smoke, active bleeding, chest pain). In that case distortion is "None — genuine safety signal", genuine_risk_signal is true, and suggested_response tells the user to act now — never to hold an ERP delay.
- resolution: how the flow should terminate:
    - "genuine" — real new sensory evidence of danger → act now (same as genuine_risk_signal true).
    - "auto" — an anchor already shows no action was warranted (e.g. "my hands feel dirty but look completely clean"); the loop resolves on its own, no ERP delay needed.
    - "hitl" — a repeat/doubt compulsion (checking, re-doing) where the urge persists → hold an ERP delay the user urge-surfs.

Be accurate and concise. A repeated doubt with no new evidence is the loop; new real evidence is not.`;

// JSON Schema for structured output. Structured outputs require
// additionalProperties:false and an explicit required list.
const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    distortion: { type: "string" },
    risk: { type: "string", enum: ["low", "medium", "high"] },
    rationale: { type: "string" },
    suggested_response: { type: "string" },
    genuine_risk_signal: { type: "boolean" },
    resolution: { type: "string", enum: ["hitl", "auto", "genuine"] },
  },
  required: [
    "distortion",
    "risk",
    "rationale",
    "suggested_response",
    "genuine_risk_signal",
    "resolution",
  ],
  additionalProperties: false,
} as const;

interface ModelAnalysis {
  distortion: string;
  risk: RiskLevel;
  rationale: string;
  suggested_response: string;
  genuine_risk_signal: boolean;
  resolution: Resolution;
}

/**
 * Analyze a trigger with the real model. Returns null if no model is configured
 * or the call fails — the caller falls back to the heuristic. `anchors` are the
 * user's calm-baseline rules, given to the model as grounding context.
 */
export async function analyzeWithModel(
  trigger: string,
  anchors: string[]
): Promise<DistortionAnalysis | null> {
  const resolved = resolveModel();
  if (!resolved) return null;

  const anchorContext =
    anchors.length > 0
      ? `The user's calm-baseline anchors:\n${anchors.map((a) => `- ${a}`).join("\n")}\n\n`
      : "";

  try {
    const res = await resolved.client.messages.create({
      model: resolved.model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      output_config: {
        format: { type: "json_schema", name: "analysis", schema: ANALYSIS_SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: `${anchorContext}Trigger: "${trigger}"`,
        },
      ],
    } as Parameters<ModelClient["messages"]["create"]>[0]);

    const block = "content" in res ? res.content.find((b) => b.type === "text") : undefined;
    if (!block || block.type !== "text") return null;

    const parsed = JSON.parse(block.text) as ModelAnalysis;
    return {
      trigger_event: trigger,
      distortion: parsed.distortion,
      risk: parsed.risk,
      rationale: parsed.rationale,
      suggested_response: parsed.suggested_response,
      genuine_risk_signal: parsed.genuine_risk_signal,
      resolution:
        parsed.resolution ??
        (parsed.genuine_risk_signal ? "genuine" : "hitl"),
    };
  } catch {
    // Network / auth / parse failure — fall back to the heuristic.
    return null;
  }
}

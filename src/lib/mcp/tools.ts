/**
 * RealityAnchor MCP tool catalog + dispatch.
 *
 * Three tools the Alexa+ assistant can call mid-conversation to ground a user
 * who is spiralling in an OCD / cognitive loop:
 *
 *   1. get_baseline_rules         — read the user's own calm-state rules back.
 *   2. evaluate_cognitive_distortion — name the distortion + rate the risk.
 *   3. trigger_erp_delay          — start a Human-in-the-Loop "urge surf" delay.
 *
 * Kept transport-agnostic: server.ts wires these into the low-level MCP `Server`
 * via setRequestHandler(ListToolsRequestSchema/CallToolRequestSchema).
 */

import { getBaselineRulesForUser } from "./baselineRules";
import { evaluateCognitiveDistortion } from "./distortions";
import { analyzeWithModel } from "./model";
import { startErpDelay } from "./erp";

/** JSON-Schema tool descriptors advertised via tools/list. */
export const TOOL_DEFINITIONS = [
  {
    name: "get_baseline_rules",
    description:
      "Return the user's pre-committed 'calm baseline' rules — the grounding statements they wrote while calm. Call this first when a user is looping so you can read their own words back to them instead of improvising reassurance.",
    inputSchema: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The user's stable identifier (e.g. 'demo-user').",
        },
      },
      required: ["userId"],
      additionalProperties: false,
    },
  },
  {
    name: "evaluate_cognitive_distortion",
    description:
      "Classify a trigger event (spoken or typed) against common CBT cognitive distortions and return a distortion label, risk tier, rationale, and suggested response. Also flags genuine safety signals that should NOT be treated as the loop.",
    inputSchema: {
      type: "object",
      properties: {
        trigger_event: {
          type: "string",
          description:
            "The user's worry or trigger, in their own words. May be a transcribed voice utterance or typed text.",
        },
      },
      required: ["trigger_event"],
      additionalProperties: false,
    },
  },
  {
    name: "trigger_erp_delay",
    description:
      "Start a Human-in-the-Loop ERP (Exposure & Response Prevention) delay: the user commits to waiting N minutes before performing a compulsion. Returns a confirmation with the delay window. Use after a distortion is identified and the user is willing to urge-surf.",
    inputSchema: {
      type: "object",
      properties: {
        delay_minutes: {
          type: "number",
          description: "How many minutes to hold before acting on the urge.",
          minimum: 1,
          maximum: 120,
        },
      },
      required: ["delay_minutes"],
      additionalProperties: false,
    },
  },
] as const;

/** MCP tool result: a content array. We return pretty-printed JSON text. */
function jsonResult(payload: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

function errorResult(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

/**
 * Execute a tool call by name. Returns an MCP CallToolResult.
 * Validation is intentionally light here (mock backend); the JSON Schemas above
 * are the primary contract advertised to the client.
 */
export async function callTool(
  name: string,
  args: Record<string, unknown> | undefined
): Promise<ReturnType<typeof jsonResult>> {
  const input = args ?? {};

  switch (name) {
    case "get_baseline_rules": {
      const userId = String(input.userId ?? "").trim();
      if (!userId) return errorResult("get_baseline_rules requires a userId.");
      return jsonResult({
        userId,
        rules: getBaselineRulesForUser(userId),
      });
    }

    case "evaluate_cognitive_distortion": {
      const trigger = String(input.trigger_event ?? "").trim();
      if (!trigger)
        return errorResult(
          "evaluate_cognitive_distortion requires a trigger_event string."
        );
      // Real model first; the keyword heuristic is only the dev/offline fallback.
      const anchors = getBaselineRulesForUser("demo-user").map((r) => r.rule);
      const modelResult = await analyzeWithModel(trigger, anchors);
      const analysis = modelResult ?? evaluateCognitiveDistortion(trigger);
      return jsonResult({
        ...analysis,
        source: modelResult ? "model" : "heuristic",
      });
    }

    case "trigger_erp_delay": {
      const minutes = Number(input.delay_minutes);
      if (!Number.isFinite(minutes) || minutes <= 0)
        return errorResult(
          "trigger_erp_delay requires a positive delay_minutes number."
        );
      return jsonResult(startErpDelay(minutes));
    }

    default:
      return errorResult(`Unknown tool: ${name}`);
  }
}

/**
 * Analysis endpoint for the /mcp-view UI. Mirrors what the
 * evaluate_cognitive_distortion MCP tool does — real model first, heuristic
 * fallback — so the visual flow's node details are model-generated whenever a
 * model is configured. Returns a `source` field ("model" | "heuristic") so the
 * UI can show which path produced the analysis.
 */

import { getBaselineRulesForUser } from "@/lib/mcp/baselineRules";
import { evaluateCognitiveDistortion } from "@/lib/mcp/distortions";
import { analyzeWithModel } from "@/lib/mcp/model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  let body: { trigger?: string; anchors?: string[] } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    /* empty body → handled below */
  }

  const trigger = String(body.trigger ?? "").trim();
  if (!trigger) {
    return Response.json({ error: "trigger required" }, { status: 400 });
  }

  const anchors =
    Array.isArray(body.anchors) && body.anchors.length > 0
      ? body.anchors.filter((a) => typeof a === "string")
      : getBaselineRulesForUser("demo-user").map((r) => r.rule);

  const modelResult = await analyzeWithModel(trigger, anchors);
  const analysis = modelResult ?? evaluateCognitiveDistortion(trigger);

  return Response.json({
    ...analysis,
    source: modelResult ? "model" : "heuristic",
  });
}

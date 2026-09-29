/**
 * Human-in-the-Loop callback — the user confirmed they waited out the ERP delay
 * without acting on the compulsion.
 *
 * The /mcp-view frontend POSTs here when the user clicks "I waited it out" /
 * "Commit to Delay". We close the matching server-side ERP delay (if we have its
 * id) and return a confirmation that RealityAnchor / Alexa+ can relay back to
 * the user — closing the loop.
 */

import { resolveErpDelay } from "@/lib/mcp/erp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ResumePayload {
  delayId?: string;
  trigger?: string;
  delayMinutes?: number;
  /** e.g. "delayed" (waited full window) or "committed_early". */
  outcome?: string;
}

export async function POST(req: Request): Promise<Response> {
  let body: ResumePayload = {};
  try {
    body = (await req.json()) as ResumePayload;
  } catch {
    // Empty/invalid body is fine — the confirmation doesn't require fields.
  }

  const resolution = resolveErpDelay(body.delayId);

  return Response.json({
    ...resolution,
    outcome: body.outcome ?? "delayed",
    trigger: body.trigger ?? null,
    delayMinutes: body.delayMinutes ?? null,
  });
}

/**
 * ERP (Exposure & Response Prevention) delay coordination.
 *
 * `trigger_erp_delay` records a Human-in-the-Loop pause: the user commits to
 * waiting `delay_minutes` before performing a compulsion. For Phase 1 this is a
 * mock — we compute and return the delay window so the assistant (and, later,
 * the MCP App UI) can show a countdown. State is kept process-local on
 * globalThis so multiple route-handler module instances share it.
 *
 * Serverless: the delayId also encodes its own start time and length
 * (`erp-<startedAt base36>-<minutes>-<seq>`), so /api/resume-session can match
 * a delay issued by a different function instance without a shared store.
 */

export interface ErpDelayConfirmation {
  status: "started";
  delayId: string;
  delay_minutes: number;
  started_at: string;
  ends_at: string;
  message: string;
}

interface ActiveDelay {
  delayId: string;
  delayMinutes: number;
  startedAt: number;
  endsAt: number;
}

const globalForErp = globalThis as unknown as {
  __erpDelays?: Map<string, ActiveDelay>;
  __erpSeq?: number;
};
const delays: Map<string, ActiveDelay> =
  globalForErp.__erpDelays ?? (globalForErp.__erpDelays = new Map());

/** Self-describing id: start time + length, plus a per-instance sequence. */
function nextDelayId(startedAt: number, delayMinutes: number): string {
  const n = (globalForErp.__erpSeq = (globalForErp.__erpSeq ?? 0) + 1);
  return `erp-${startedAt.toString(36)}-${delayMinutes}-${n}`;
}

const DELAY_ID_RE = /^erp-([0-9a-z]+)-(\d+)-\d+$/;

/** Rebuild a delay from its id when this instance didn't issue it. */
function delayFromId(delayId: string): ActiveDelay | undefined {
  const m = DELAY_ID_RE.exec(delayId);
  if (!m) return undefined;
  const startedAt = parseInt(m[1], 36);
  const delayMinutes = Number(m[2]);
  if (!Number.isFinite(startedAt) || !Number.isFinite(delayMinutes)) return undefined;
  return { delayId, delayMinutes, startedAt, endsAt: startedAt + delayMinutes * 60_000 };
}

/** Begin an ERP delay and return a confirmation for the assistant to relay. */
export function startErpDelay(delayMinutes: number): ErpDelayConfirmation {
  const startedAt = Date.now();
  const endsAt = startedAt + delayMinutes * 60_000;
  const delayId = nextDelayId(startedAt, delayMinutes);

  delays.set(delayId, { delayId, delayMinutes, startedAt, endsAt });

  return {
    status: "started",
    delayId,
    delay_minutes: delayMinutes,
    started_at: new Date(startedAt).toISOString(),
    ends_at: new Date(endsAt).toISOString(),
    message: `A ${delayMinutes}-minute ERP delay has started. Hold the urge until ${new Date(
      endsAt
    ).toLocaleTimeString()}. Notice the anxiety rise and fall — you do not have to act on it.`,
  };
}

/** Look up an active delay (used later by the MCP App UI / resume flow). */
export function getErpDelay(delayId: string): ActiveDelay | undefined {
  return delays.get(delayId) ?? delayFromId(delayId);
}

export interface ErpResolution {
  status: "resolved";
  delayId: string | null;
  /** Whether a matching active delay was found and closed. */
  matched: boolean;
  resolvedAt: string;
  message: string;
}

/**
 * Close an ERP delay after the user confirms they waited out the urge — the
 * Human-in-the-Loop callback that tells RealityAnchor the loop was broken. If a
 * delayId is supplied we clear the matching active delay; either way we return a
 * confirmation the assistant can relay back to the user.
 */
export function resolveErpDelay(delayId?: string | null): ErpResolution {
  let matched = false;
  if (delayId && delays.has(delayId)) {
    delays.delete(delayId);
    matched = true;
  } else if (delayId && delayFromId(delayId)) {
    // Issued by another (serverless) instance — the id carries the delay.
    matched = true;
  }
  return {
    status: "resolved",
    delayId: delayId ?? null,
    matched,
    resolvedAt: new Date().toISOString(),
    message:
      "The user completed the ERP delay without acting on the compulsion. The loop was broken — acknowledge the win and reinforce that sitting with the urge is the rep that retrains the brain.",
  };
}

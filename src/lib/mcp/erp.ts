/**
 * ERP (Exposure & Response Prevention) delay coordination.
 *
 * `trigger_erp_delay` records a Human-in-the-Loop pause: the user commits to
 * waiting `delay_minutes` before performing a compulsion. For Phase 1 this is a
 * mock — we compute and return the delay window so the assistant (and, later,
 * the MCP App UI) can show a countdown. State is kept process-local on
 * globalThis so multiple route-handler module instances share it.
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

/** Monotonic id — avoids Math.random/Date.now nondeterminism concerns in ids. */
function nextDelayId(): string {
  const n = (globalForErp.__erpSeq = (globalForErp.__erpSeq ?? 0) + 1);
  return `erp-${n}`;
}

/** Begin an ERP delay and return a confirmation for the assistant to relay. */
export function startErpDelay(delayMinutes: number): ErpDelayConfirmation {
  const startedAt = Date.now();
  const endsAt = startedAt + delayMinutes * 60_000;
  const delayId = nextDelayId();

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
  return delays.get(delayId);
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

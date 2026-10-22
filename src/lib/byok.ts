/**
 * Bring-your-own-key (BYOK) types and helpers, shared by the client store and
 * the server model layer.
 *
 * Credentials the user pastes in Settings live only in their browser
 * (localStorage) and are sent in the POST body of each analysis request. The
 * server builds a per-request model from them and never persists them. This file
 * is deliberately free of any SDK import so it is safe to use in client code.
 */

/** Bedrock credentials the user can paste in Settings to drive the model. */
export interface BedrockCreds {
  /** AWS region, e.g. "us-west-2". */
  region?: string;
  /** A Bedrock API key (bearer token) — the simplest BYOK option. */
  apiKey?: string;
  /** OR an IAM access key pair. */
  accessKeyId?: string;
  secretAccessKey?: string;
  /** Optional session token for temporary credentials. */
  sessionToken?: string;
}

/** What to do when no model is configured (no BYOK creds and no server env). */
export type FallbackMode = "heuristic" | "alert";

/**
 * True when the pasted creds are usable: either a Bedrock bearer API key, or an
 * IAM access-key pair. (Region/session-token alone don't count.)
 */
export function isAiConnected(creds: BedrockCreds | null | undefined): boolean {
  if (!creds) return false;
  return Boolean(
    creds.apiKey?.trim() ||
      (creds.accessKeyId?.trim() && creds.secretAccessKey?.trim())
  );
}

/** Drop empty fields so we never send/store blank strings. */
export function cleanCreds(creds: BedrockCreds | null): BedrockCreds | null {
  if (!creds) return null;
  const out: BedrockCreds = {};
  for (const [k, v] of Object.entries(creds)) {
    if (typeof v === "string" && v.trim()) out[k as keyof BedrockCreds] = v.trim();
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Header used to forward BYOK creds to the loopback MCP server. */
export const BYOK_HEADER = "x-reality-anchor-bedrock";

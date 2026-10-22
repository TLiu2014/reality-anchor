/**
 * RealityAnchor MCP endpoint — Streamable HTTP transport.
 *
 * Alexa+ connects to this route as an MCP add-on. We use the SDK's
 * `WebStandardStreamableHTTPServerTransport`, which implements the MCP
 * Streamable HTTP spec (POST for requests, SSE for streamed responses) directly
 * on Web-standard Request/Response — exactly what a Next.js App Router route
 * handler receives.
 *
 * NOTE ON TRANSPORT CHOICE: the older `SSEServerTransport` in the SDK is
 * deprecated and Node-only (it needs a raw `http.ServerResponse`, which App
 * Router never exposes). Streamable HTTP is the current transport clients like
 * Alexa+ speak, and it still uses SSE under the hood for streaming — so it
 * satisfies the "Server-Sent Events / streamable HTTP" requirement correctly.
 *
 * Stateless mode: a fresh Server + transport per request (no session id). This
 * is the simplest correct model for serverless-style route handlers.
 */

import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { createRealityAnchorServer } from "@/lib/mcp/server";
import { BYOK_HEADER, type BedrockCreds } from "@/lib/byok";

// MCP needs the Node.js runtime (not Edge) and must never be statically cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * BYOK creds reach this route only on the in-app loopback call (the /api/agent
 * simulator forwards them as a header); external MCP clients send none and the
 * tools fall back to the server env.
 */
function credsFromHeader(req: Request): BedrockCreds | null {
  const raw = req.headers.get(BYOK_HEADER);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as BedrockCreds) : null;
  } catch {
    return null;
  }
}

async function handle(req: Request): Promise<Response> {
  const server = createRealityAnchorServer(credsFromHeader(req));

  // Stateless: no sessionIdGenerator => no session tracking between requests.
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);

  const response = await transport.handleRequest(req);

  // Once the response is fully consumed, tear the server down.
  transport.onclose = () => {
    void server.close();
  };

  return response;
}

// Streamable HTTP multiplexes everything over these verbs:
//   POST   — JSON-RPC requests (initialize, tools/list, tools/call)
//   GET    — open the server->client SSE stream
//   DELETE — terminate a session (no-op in stateless mode)
export { handle as GET, handle as POST, handle as DELETE };

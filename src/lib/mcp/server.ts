/**
 * Builds the RealityAnchor MCP `Server` (low-level API) and registers the
 * tools/list and tools/call request handlers.
 *
 * A fresh Server + transport is created per request in the route handler
 * (stateless mode), which is the simplest correct model for Next.js route
 * handlers and matches how Alexa+ connects over Streamable HTTP.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { TOOL_DEFINITIONS, callTool } from "./tools";
import type { BedrockCreds } from "../byok";

/**
 * Build the MCP server. When BYOK creds are passed (threaded from the loopback
 * caller's headers), tool calls that hit the model use those creds; external
 * clients (e.g. Claude Desktop) pass none and fall back to the server env.
 */
export function createRealityAnchorServer(creds?: BedrockCreds | null): Server {
  const server = new Server(
    {
      name: "reality-anchor",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
      instructions:
        "RealityAnchor helps a user break an OCD / cognitive loop. When a user " +
        "sounds like they are spiralling: (1) call get_baseline_rules to read " +
        "their own calm-state rules back to them, (2) call " +
        "evaluate_cognitive_distortion on what they said to name the distortion " +
        "and gauge risk, then (3) if they are willing to urge-surf, call " +
        "trigger_erp_delay. If evaluate_cognitive_distortion flags a genuine " +
        "safety signal, do NOT hold a delay — tell them to act on it.",
    }
  );

  // tools/list — advertise the catalog.
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_DEFINITIONS,
  }));

  // tools/call — dispatch to the handler by name.
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return callTool(name, args as Record<string, unknown> | undefined, creds);
  });

  return server;
}

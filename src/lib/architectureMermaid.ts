/**
 * Source of truth for RealityAnchor's architecture diagram. Mirrors
 * `docs/architecture.mmd` (the standalone file). Paste either into a Mermaid
 * viewer (e.g. mermaid.live) to render it, and export the image to
 * `public/architecture.svg` — that's what the expandable "Full system diagram"
 * on /docs displays. Keep this string and docs/architecture.mmd in sync.
 */
export const ARCHITECTURE_MERMAID = `flowchart TD
    Client["MCP client — the model<br/>Alexa+, Claude Desktop, or the in-app /mcp-view simulator"]

    subgraph App["RealityAnchor · one Next.js deploy"]
        MCP["MCP server · /api/mcp<br/>Streamable HTTP"]
        subgraph Tools["MCP tools"]
            T1["get_baseline_rules<br/>reads the user's calm-state anchors"]
            T2["evaluate_cognitive_distortion<br/>classifies the trigger, flags real danger"]
            T3["trigger_erp_delay<br/>starts a human-in-the-loop ERP delay"]
        end
    end

    Model["Claude — Amazon Bedrock (BYOK or env)<br/>or Anthropic API · keyword heuristic fallback"]
    UI["Grounding view · /mcp-view<br/>React Flow chat in the Alexa app"]

    Client -- "tool calls · JSON-RPC over MCP" --> MCP
    MCP --> T1
    MCP --> T2
    MCP --> T3
    T2 -- "generates the analysis" --> Model
    MCP -. "tool results render the grounding view" .-> UI
    UI -. "user: I waited it out · HITL callback" .-> MCP
`;

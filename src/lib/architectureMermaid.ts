/**
 * Standalone source of truth for RealityAnchor's architecture. Paste this block
 * into any Mermaid viewer (e.g. mermaid.live) to render it, and export the image
 * to `public/architecture.svg` — that's what the expandable "Full system
 * diagram" on /docs displays.
 */
export const ARCHITECTURE_MERMAID = `flowchart TD
    subgraph Alexa["Alexa+ · the model (MCP client)"]
        Voice["Voice on Echo<br/>· text in the Alexa app"]
    end

    subgraph App["RealityAnchor · one Next.js deploy"]
        MCP["/api/mcp<br/>MCP server · Streamable HTTP"]
        Tools["Tools<br/>get_baseline_rules<br/>evaluate_cognitive_distortion<br/>trigger_erp_delay"]
        View["/mcp-view<br/>visual grounding UI<br/>React Flow · Zustand"]
        Analyze["/api/analyze<br/>UI analysis endpoint"]
        Resume["/api/resume-session<br/>HITL callback"]
        Anchors["Anchors<br/>client localStorage + server defaults"]
    end

    Model["Real model — Claude<br/>Anthropic API or Amazon Bedrock<br/>(keyword heuristic fallback)"]

    Voice -- "MCP tool calls (JSON-RPC)" --> MCP
    MCP --> Tools
    Tools -- "evaluate_cognitive_distortion" --> Model
    Alexa -- "opens /mcp-view?tool=...&trigger=..." --> View
    View -- "POST { trigger, anchors }" --> Analyze
    Analyze -- "model first" --> Model
    Anchors -. "feed the analysis" .-> Analyze
    View -- "user: I waited it out" --> Resume
    Resume -. "closes the ERP delay" .-> Tools
    Model -. "distortion · risk · resolution" .-> Analyze
`;

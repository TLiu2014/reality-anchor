# Local development & testing

Everything about running RealityAnchor on your own machine and exercising it end
to end. For shipping it to a public URL, see [`DEPLOYMENT.md`](./DEPLOYMENT.md).

The app is a single Next.js (App Router) project with these surfaces:

| Route | What it is |
| --- | --- |
| `/` | Landing page |
| `/docs` | In-app documentation |
| `/mcp-view` | The visual MCP App (the grounding UI Alexa+ renders) |
| `/api/mcp` | The **MCP server** (Streamable HTTP) an AI connects to |
| `/api/analyze` | Analysis endpoint the UI uses (real model → heuristic fallback) |
| `/api/resume-session` | The Human-in-the-Loop callback (user finished the ERP delay) |

---

## 1. Prerequisites

- **Node.js 20+** (22 recommended)
- **pnpm** (`corepack enable` gives you it, or `npm i -g pnpm`)

The repo ships a project-level `.npmrc` pinning the public npm registry, so
`pnpm install` works without any registry config.

---

## 2. Run the dev server

```bash
pnpm install          # first time only
pnpm dev              # http://localhost:3000  (hot-reload)
```

Open:

- Visual app:  http://localhost:3000/mcp-view
- Landing:     http://localhost:3000
- Docs:        http://localhost:3000/docs

Leave `pnpm dev` running in one terminal; drive it from a browser or a second
terminal.

---

## 3. Analysis: real model vs. heuristic

The distortion analysis that drives the flow (the distortion label, risk,
rationale, and node details) is produced by a **real model** when credentials are
present. With none, it falls back to a deterministic keyword **heuristic** — fine
for UI work and offline demos, but the "real" behaviour is the model.

Which path runs is chosen automatically (first match wins):

1. `ANTHROPIC_API_KEY` set → first-party Claude API
2. AWS creds set (`AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`) → Claude via
   Amazon Bedrock (on-theme for the Alexa+ / Amazon track)
3. neither → heuristic fallback

To use a real model locally, copy the example env and fill one option in:

```bash
cp .env.example .env.local
# then set EITHER:
#   ANTHROPIC_API_KEY=sk-ant-...
# OR (Bedrock):
#   AWS_ACCESS_KEY_ID=...
#   AWS_SECRET_ACCESS_KEY=...
#   AWS_REGION=us-west-2
# Optional model override (defaults to claude-opus-4-8 / anthropic.claude-opus-4-8):
#   REALITY_ANCHOR_MODEL=anthropic.claude-sonnet-4-6
```

Restart `pnpm dev` after changing env. Every analysis node in the UI shows an
`AI` or `heuristic` badge so you can see which path ran. Quick check from the
terminal:

```bash
curl -s -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"trigger":"I keep worrying I left the stove on"}' | jq
# → { ..., "resolution": "hitl", "source": "model" | "heuristic" }
```

> No key configured is a valid state — the app runs fully on the heuristic. The
> real model only becomes required if you want model-quality analysis.

---

## 4. Test the visual app in the browser

Open `/mcp-view` and either click a **suggestion card** in the Session panel or
type a trigger. The flow builds up step by step: Trigger → Analysis → outcome.
The three presets cover the three outcomes:

- 🔒 **Checking urge** → Human-in-the-Loop **ERP delay** (countdown + "Commit to Delay")
- 🧼 **Contamination** → **auto-resolves** from a matching anchor (no delay)
- ⚠️ **Real safety signal** → **act now** (no delay; it's not the loop)

You can also open the app with the context Alexa+ would pass as URL params — this
is exactly how a real hand-off hydrates the view:

```
http://localhost:3000/mcp-view?tool=trigger_erp_delay&minutes=3&trigger=touched_mail
```

Supported params: `tool`, `trigger` (underscores become spaces), `minutes`,
`delayId`, `conversationId` (a matching id continues the same diagram),
`userId`. Other things to try in the UI:

- **Layout** — the gear menu toggles center view (Node Details vs Flow map).
- **Theme** — the sun/moon toggle (defaults to light).
- **Anchors tab** — edit your calm-baseline rules; they feed the local analysis.
- **Resizable panes** — drag the dividers between the three panels.

---

## 5. Test the MCP server with a client

**Any MCP client is your local Alexa+ stand-in — give it
`http://localhost:3000/api/mcp` with the Streamable HTTP transport.** Pick
whichever you already use.

**MCP Inspector** (official GUI, zero setup — best for poking raw tool calls):

```bash
npx @modelcontextprotocol/inspector
# In the UI: Transport = "Streamable HTTP", URL = http://localhost:3000/api/mcp → Connect
# Tools: get_baseline_rules, evaluate_cognitive_distortion, trigger_erp_delay
```

**Claude Code** (talk in natural language; the model decides which tools to call):

```bash
claude mcp add --transport http reality-anchor http://localhost:3000/api/mcp
claude mcp list                       # verify it connects
# then in a session: /mcp for status, and say "I keep worrying I left the stove on"
claude mcp remove reality-anchor      # when done
```

**Claude Desktop** — either:

- *Custom Connector (simplest):* Settings → Connectors → **Add custom connector**
  → paste `http://localhost:3000/api/mcp`, then restart the app.
- *Config file (HTTP via the `mcp-remote` bridge):* edit
  `~/Library/Application Support/Claude/claude_desktop_config.json`:

  ```json
  {
    "mcpServers": {
      "reality-anchor": {
        "command": "npx",
        "args": ["-y", "mcp-remote", "http://localhost:3000/api/mcp"]
      }
    }
  }
  ```

  Fully quit and reopen Claude Desktop; the tools appear in the tools menu.

**Cursor** — create `.cursor/mcp.json` (or `~/.cursor/mcp.json` for global):

```json
{ "mcpServers": { "reality-anchor": { "url": "http://localhost:3000/api/mcp" } } }
```

Then enable it in Cursor → Settings → MCP.

**Other MCP-capable apps** (VS Code + Copilot, Windsurf, Cline, …) take the same
thing: transport **Streamable HTTP**, URL `http://localhost:3000/api/mcp`. Config
locations vary by app version — check each app's current MCP docs — but the URL +
transport are all they need.

> Config specifics for Claude Desktop / Cursor / others drift between versions;
> the URL and Streamable HTTP transport are the parts that don't change.

---

## 6. Exercise the endpoints directly

Handy for quick checks without a client. The MCP endpoint speaks JSON-RPC over
Streamable HTTP (use the Inspector or SDK client rather than raw curl), but the
plain HTTP routes are easy to hit:

```bash
# Analysis (real model if configured, else heuristic)
curl -s -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"trigger":"my hands feel dirty but they look completely clean"}' | jq

# HITL callback — the user finished the ERP delay
curl -s -X POST http://localhost:3000/api/resume-session \
  -H "Content-Type: application/json" \
  -d '{"delayId":"erp-1","outcome":"delayed"}' | jq
```

For a scripted MCP client round-trip (`initialize` → `tools/list` → `tools/call`),
use `@modelcontextprotocol/sdk`'s `Client` + `StreamableHTTPClientTransport`
pointed at `http://localhost:3000/api/mcp`.

---

## 7. Full local end-to-end (the demo rehearsal)

1. `pnpm dev` running (with a model key set, for the real experience).
2. In Claude Code or Claude Desktop, describe an OCD-style worry.
3. Watch it call `evaluate_cognitive_distortion`, then `trigger_erp_delay`.
4. Open the matching `http://localhost:3000/mcp-view?...` URL in a browser.
5. Sit through the countdown, click **I waited it out** → green "Resolved".

That's the same sequence you'd record for a submission video, just local. Split
your screen with the client chat on one side and `/mcp-view` on the other.

---

## 8. Run the production bundle locally

To smoke-test the optimized build before deploying:

```bash
pnpm build && pnpm start        # serves the production build on :3000
```

`pnpm start` prints a warning about `output: "standalone"` — harmless for local
testing. For a true standalone run use `node .next/standalone/server.js`.

---

## Troubleshooting

- **"Could not find a production build in the '.next' directory"** — you ran
  `pnpm start` without `pnpm build`. Build first, or use `pnpm dev`.
- **Analysis shows `heuristic` when you expected `AI`** — no model creds are
  visible to the server. Check `.env.local`, restart `pnpm dev`, and (Bedrock)
  confirm the model in `REALITY_ANCHOR_MODEL` is enabled on your account.
- **MCP client won't connect** — confirm the transport is **Streamable HTTP**
  (not stdio/SSE-legacy) and the URL is exactly `http://localhost:3000/api/mcp`.
- **Persisted flow won't clear** — the session is stored in `localStorage`
  (`realityanchor:*`). Click **New** in the Session panel, or clear site data.

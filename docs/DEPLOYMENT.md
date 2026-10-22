# Deploying RealityAnchor

RealityAnchor is a Next.js (App Router) app with two surfaces that ship from one
deployment:

- **`/api/mcp`** — the MCP server (Streamable HTTP) an Alexa+-style agent connects to.
- **`/mcp-view`** — the visual MCP App, with its `/api/agent` (in-app Alexa+
  simulator), `/api/analyze`, and `/api/resume-session` routes.

Deploy once and you get both.

> **Demoing? You don't need to deploy.** The whole thing runs on `localhost` with
> a desktop MCP client (Claude Desktop, Claude Code, Gemini, …) — see
> [`DEV.md`](./DEV.md). Deploy only when you want a public URL
> (e.g. for the submission repo).

---

## Vercel's free tier is enough

Deploy to Vercel's free (Hobby) plan — no Docker, no cloud infra. It fits because:

- Next.js is first-class on Vercel — zero-config build.
- The MCP server is **stateless** (a fresh server per request), so any function
  instance can serve any call.
- Routes that can call the model (`/api/agent`, `/api/mcp`, `/api/analyze`) set
  `export const maxDuration = 60`, which every Vercel plan allows. A model turn in
  `/api/agent` is several Bedrock round trips, and Vercel stops a function at its
  max duration even mid-stream, so this gives it headroom.
- Streaming / SSE (what Streamable HTTP and `/api/agent` use) is supported on Hobby.
- The ERP callback is serverless-safe: the delay id carries its own start time and
  length, so `/api/resume-session` matches it on any instance without a shared store.
- A hackathon project is non-commercial, so it's within Hobby's terms of use.

---

## Environment variables

The app deploys with **no configuration**. With no server credentials, the
analysis uses a deterministic keyword heuristic, for the in-app chat and for
external MCP clients alike. Visitors can paste their own Amazon Bedrock key in the
gear menu (stored only in their browser, sent per request) to get real model
output, or set **When no AI key is set** to **Require a key** to block the chat
until a key is added. To give everyone **model-quality analysis** by
default, set one model provider. Resolution is automatic, first match wins:

| Variable(s) | Effect |
| --- | --- |
| `ANTHROPIC_API_KEY` | Analysis via the first-party Claude API |
| `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` (+ `AWS_REGION`) | Analysis via Claude on **Amazon Bedrock** (on-theme for the Alexa+ track) |
| `REALITY_ANCHOR_MODEL` (optional) | Override the model id — defaults to `claude-opus-4-8` (first-party) / `anthropic.claude-opus-4-8` (Bedrock). Set e.g. `anthropic.claude-sonnet-4-6` if that's what your Bedrock account has enabled |
| `NEXT_PUBLIC_BASE_URL` (optional) | Public base URL, if you need it for links |
| `VERCEL_AUTOMATION_BYPASS_SECRET` (set by Vercel) | Lets `/api/agent`'s loopback call reach `/api/mcp` on protected preview URLs. See [Preview deployments](#preview-deployments) |

Set these in Vercel under **Project → Settings → Environment Variables**. With
none set, every analysis node renders a `heuristic` badge; with a provider set,
it renders `AI`.

---

## Deploy to Vercel

### Via the CLI

```bash
cd ~/code/reality-anchor
npm i -g vercel        # if you don't have it
vercel login
vercel                 # first run: link/create the project, accept defaults
vercel --prod          # promote to a production URL
```

That prints your production URL, e.g. `https://reality-anchor.vercel.app`. Your
two surfaces are then:

- MCP endpoint: `https://reality-anchor.vercel.app/api/mcp`
- Visual app:   `https://reality-anchor.vercel.app/mcp-view`

### Via the dashboard

1. Push the repo to GitHub (default host for this project: `TLiu2014`).
2. On vercel.com → **Add New… → Project** → import the repo.
3. Framework preset auto-detects **Next.js**. Leave build/output at defaults.
4. Add the model env vars (above) if you want real-model analysis, then deploy.

Notes:

- The repo uses pnpm (`pnpm-lock.yaml`); Vercel detects and uses it automatically.
- `output: "standalone"` in `next.config.mjs` is harmless on Vercel — it uses its
  own build adapter and ignores it.

### Preview deployments

Vercel's **Deployment Protection** guards preview URLs by default. The in-app
simulator (`/api/agent`) calls its own `/api/mcp` over HTTP, and on a protected
preview that loopback call gets a 401, so the chat falls back or errors. The
production domain isn't protected, so it isn't affected.

To use the simulator on previews, enable **Project → Settings → Deployment
Protection → Protection Bypass for Automation**. Vercel then exposes
`VERCEL_AUTOMATION_BYPASS_SECRET`, and `/api/agent` sends it as the
`x-vercel-protection-bypass` header on the loopback call. Redeploy after enabling it.

---

## Post-deploy verification

Point the official MCP Inspector at your live endpoint and call the tools:

```bash
npx @modelcontextprotocol/inspector
# In the UI: Transport = Streamable HTTP, URL = https://<host>/api/mcp → Connect
# Expect: get_baseline_rules, evaluate_cognitive_distortion, trigger_erp_delay
```

Then open the visual app with sample context:

```
https://<host>/mcp-view?tool=trigger_erp_delay&minutes=3&trigger=touched_mail
```

Check which model provider the server sees (`null` means heuristic or BYOK only):

```bash
curl -s https://<host>/api/agent
# → {"provider":"bedrock","defaultModel":"bedrock"}  (or null without env creds)
```

You should see the flow build up — Trigger → Analysis → a 3:00 ERP countdown —
and "Commit to Delay / I waited it out" flip the node to green "Resolved". If a
model provider is configured, the Analysis node shows an `AI` badge.

---

## Connecting to Alexa+ (and testing)

You cannot test against a real Alexa+, and you are not expected to: there is no
Alexa+ MCP simulator, developer console, or device access. Amazon's guidance for
the track is to *"simulate an Alexa+ experience using your preferred agentic tools
via a web app."* So testing means pointing any MCP client at your Streamable HTTP
endpoint (it stands in for Alexa+) and opening `/mcp-view`.

The full how-to — clients, the three demo outcomes, and the end-to-end run — is in
[`DEV.md`](./DEV.md); it works the same against `localhost` and
against your deployed `https://<host>`. On a real Alexa+ (post-hackathon, when
Amazon opens it) you'd register the deployed `/api/mcp` URL as an MCP add-on; our
URL-parameter hydration simulates how Alexa+ renders the visual app in-chat.

---

## Caveats

- **ERP state without a shared store.** `src/lib/mcp/erp.ts` keeps active delays
  on `globalThis`, which is per-instance on serverless. To make the callback work
  anyway, each `delayId` encodes its start time and length
  (`erp-<startedAt base36>-<minutes>-<seq>`), so `/api/resume-session` can match a
  delay issued by another instance. The trade-off is that a well-formed id is
  trusted as-is. That's fine for a demo; a production build would sign the id or
  keep delays in a shared store (Redis/KV).
- **Function duration.** If Bedrock is slow and a turn hits the 60-second limit,
  the stream ends early and the chat falls back. Raise `maxDuration` (up to your
  plan's limit) in the route files if that happens.
- **MCP spec requirement (already satisfied).** The Alexa+ track requires MCP spec
  **2025-11-25 or later** over Streamable HTTP. The installed SDK
  (`@modelcontextprotocol/sdk`) advertises `2025-11-25` and uses the Web-standard
  Streamable HTTP transport — compliant.

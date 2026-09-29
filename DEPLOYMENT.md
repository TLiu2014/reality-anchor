# Deploying RealityAnchor

RealityAnchor is a Next.js (App Router) app with two surfaces that ship from one
deployment:

- **`/api/mcp`** — the MCP server (Streamable HTTP) an Alexa+-style agent connects to.
- **`/mcp-view`** — the visual MCP App, with its `/api/analyze` and
  `/api/resume-session` routes.

Deploy once and you get both. For running and testing on your own machine first,
see [`DEVELOPMENT.md`](./DEVELOPMENT.md); this doc is only about shipping to a
public URL.

---

## Recommended platform: Vercel's free tier

**Vercel's free (Hobby) plan is enough, and you do not need Docker.** It fits
because:

- Next.js is first-class on Vercel — zero-config build.
- The MCP server is **stateless**: `initialize`, `tools/list`, and `tools/call`
  each return in milliseconds, so they never approach the Hobby 60-second
  function limit that otherwise bites long-lived streams.
- Streaming / SSE (what Streamable HTTP uses) is supported on Hobby.
- A hackathon project is non-commercial, so it's within Hobby's terms of use.

The [Docker / GCP path](#option-b--docker--gcp) is only for self-hosting. The one
runtime caveat (in-memory ERP state on serverless) is covered under
[Caveats](#caveats) and does not affect the demo.

---

## Environment variables

The app runs with **no configuration** — with no credentials, the analysis uses a
deterministic keyword heuristic. To get **model-quality analysis** in production
(what you'll want for the real demo), set one model provider. Resolution is
automatic, first match wins:

| Variable(s) | Effect |
| --- | --- |
| `ANTHROPIC_API_KEY` | Analysis via the first-party Claude API |
| `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` (+ `AWS_REGION`) | Analysis via Claude on **Amazon Bedrock** (on-theme for the Alexa+ track) |
| `REALITY_ANCHOR_MODEL` (optional) | Override the model id — defaults to `claude-opus-4-8` (first-party) / `anthropic.claude-opus-4-8` (Bedrock). Set e.g. `anthropic.claude-sonnet-4-6` if that's what your Bedrock account has enabled |
| `NEXT_PUBLIC_BASE_URL` (optional) | Public base URL, if you need it for links |

Set these in Vercel under **Project → Settings → Environment Variables**, or pass
them to your container. With none set, every analysis node renders a `heuristic`
badge; with a provider set, it renders `AI`.

---

## Option A — Vercel

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

### Notes

- **`output: "standalone"` in `next.config.mjs`** is used only by the Docker path
  below; Vercel uses its own build adapter and ignores it — harmless.
- **Package manager:** the repo uses pnpm (`pnpm-lock.yaml`); Vercel detects and
  uses it automatically.

---

## Option B — Docker / GCP

Use this to self-host. The project is configured with `output: "standalone"`,
which emits a self-contained `.next/standalone/server.js`.

> Preference for this project: **build the image locally and push it** — do not
> use Cloud Build.

### 1. Add a `Dockerfile` at the repo root

```dockerfile
FROM node:22-slim AS builder
WORKDIR /app
RUN corepack enable
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Standalone output already contains a minimal node_modules.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

Add a `.dockerignore` so the build context stays small:

```
node_modules
.next
.git
```

### 2. Build locally and push (GCP Artifact Registry example)

```bash
cd ~/code/reality-anchor
IMAGE="us-west1-docker.pkg.dev/<PROJECT_ID>/<REPO>/reality-anchor:latest"

docker build --platform linux/amd64 -t "$IMAGE" .
docker push "$IMAGE"
```

> Corp-network gotcha: if `pnpm install` inside the container fails with a TLS
> `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` error, build on the host instead and copy
> the standalone output in, rather than installing in-container.

### 3. Run it

Anywhere that runs a container (Cloud Run, a VM, `docker run -p 3000:3000 "$IMAGE"`).
Pass the model env vars if you want real-model analysis. Your endpoints are then
`https://<host>/api/mcp` and `https://<host>/mcp-view`.

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

You should see the flow build up — Trigger → Analysis → a 3:00 ERP countdown —
and "Commit to Delay / I waited it out" flip the node to green "Resolved". If a
model provider is configured, the Analysis node shows an `AI` badge.

---

## Testing with (and without) Alexa+

You cannot test against a real Alexa+, and you are not expected to: there is no
Alexa+ MCP simulator, developer console, or device access. Amazon's guidance for
the track is to *"simulate an Alexa+ experience using your preferred agentic tools
via a web app."* So testing means pointing any MCP client at your Streamable HTTP
endpoint (it stands in for Alexa+) and opening `/mcp-view`. Three levels, from
quick check to full demo:

1. **Without any AI (quick sanity check).** MCP Inspector → Streamable HTTP →
   `.../api/mcp` → click each tool. In the browser, open
   `/mcp-view?tool=trigger_erp_delay&minutes=3&trigger=touched_mail` and click
   through to the green "Resolved" state.

2. **With an AI as the Alexa+ stand-in (the real demo).** Register the server
   with an agentic client so the model itself decides to call your tools:

   ```bash
   claude mcp add --transport http reality-anchor https://<host>/api/mcp
   ```

   Say *"I keep worrying I left the stove on."* Watch it call
   `evaluate_cognitive_distortion` then `trigger_erp_delay`, open the matching
   `/mcp-view?...` URL, sit through the countdown, and click **I waited it out**
   to close the loop. That end-to-end run is exactly what the judges want in the
   video. Claude Desktop or the MCP Inspector work as the client too.

3. **On real Alexa+ (post-hackathon, when Amazon opens it).** Register the
   deployed `/api/mcp` URL as an MCP add-on. The one contract still to confirm via
   office hours / the forum is exactly how Alexa+ renders the visual app in-chat;
   our URL-parameter hydration simulates that hand-off.

The same three levels work against `http://localhost:3000` — see
[`DEVELOPMENT.md`](./DEVELOPMENT.md).

---

## Caveats

- **In-memory ERP state is per-instance.** `src/lib/mcp/erp.ts` tracks active
  delays on `globalThis`. On serverless (Vercel) each request may hit a different
  instance, so a `delayId` created by `/api/mcp` may not be visible to
  `/api/resume-session` — the callback's `matched` flag can read `false` in prod.
  This does **not** affect the demo: the UI flips to "Resolved" optimistically and
  the confirmation is still returned. A production build would back this with a
  shared store (Redis/KV) or the SDK's session/resume support.
- **MCP spec requirement (already satisfied).** The Alexa+ track requires MCP spec
  **2025-11-25 or later** over Streamable HTTP. The installed SDK
  (`@modelcontextprotocol/sdk`) advertises `2025-11-25` and uses the Web-standard
  Streamable HTTP transport — compliant.

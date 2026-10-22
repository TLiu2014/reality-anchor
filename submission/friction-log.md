# RealityAnchor: friction log

Problems I ran into while building RealityAnchor, an Alexa+ MCP add-on, for
Amazon's Build, Ship, Shape hackathon (Alexa+ track). Each entry lists the task,
the steps, expected vs actual result, severity, the workaround, and a suggestion.

Project: https://github.com/TLiu2014/reality-anchor

1. Adding a custom MCP connector in a managed Claude Desktop
   - Task: connect an external MCP client to my self-hosted server for the demo.
   - Steps: Claude Desktop → Settings → Connectors → Add custom connector.
   - Expected vs actual: I expected to add the local MCP URL. The company-managed Claude Desktop doesn't allow custom connectors.
   - Severity: Medium (blocked one demo path).
   - Workaround: used Claude Code (claude mcp add --transport http …), which connected on the first try, with MCP Inspector as a fallback.
   - Suggestion: document which MCP clients work under enterprise policies, and give organizations a way to allowlist localhost or development MCP URLs.

2. MCP server transport in the Next.js App Router
   - Task: serve MCP from a Next.js App Router route handler.
   - Steps: started with the SDK's SSEServerTransport, as many examples show.
   - Expected vs actual: I expected it to work in a route handler. It needs a raw Node http.ServerResponse, which App Router never provides, and it's deprecated.
   - Severity: High (no working server until I switched).
   - Workaround: switched to WebStandardStreamableHTTPServerTransport in stateless mode, with runtime = "nodejs", dynamic = "force-dynamic", and the SDK in serverExternalPackages.
   - Suggestion: add an official Next.js App Router example to the MCP TypeScript SDK docs. I published one: github.com/TLiu2014/nextjs-mcp-streamable-http.

3. Passing per-request credentials through an MCP client
   - Task: forward a user's browser-supplied Bedrock key through my in-app agent's loopback MCP call.
   - Steps: looked for a per-request auth or header option on StreamableHTTPClientTransport.
   - Expected vs actual: I expected a documented option. It exists (requestInit.headers), but I found it by reading the SDK's type definitions, not the docs.
   - Severity: Low.
   - Workaround: requestInit: { headers: { … } } on the client transport.
   - Suggestion: document requestInit and custom headers in the client transport docs, with a BYOK or per-user auth example.

4. Bedrock client options for bring-your-own-key
   - Task: build a per-request Bedrock client from user-supplied credentials (API key or IAM keys).
   - Steps: looked for how to pass inline credentials to the Bedrock SDK client.
   - Expected vs actual: I expected the options to be documented. I found the exact names (apiKey, awsAccessKey, awsSecretAccessKey, awsSessionToken, awsRegion) in the SDK's .d.ts files.
   - Severity: Low.
   - Workaround: read node_modules type definitions.
   - Suggestion: add an "inline credentials and Bedrock API key" section to the Bedrock SDK README.

5. A stateless MCP server can't update a browser UI
   - Task: show external MCP tool calls (from a terminal client) live in my visual grounding view.
   - Expected vs actual: I hoped tool calls would show up in the UI. A stateless Streamable HTTP server has no push channel to a separate browser session, so they don't.
   - Severity: Low (design limitation, not a bug).
   - Workaround: the UI is driven by its own agent path and by URL context, and I said so clearly in the demo.
   - Suggestion: a documented pattern or example for connecting MCP tool calls to a companion UI, such as MCP Apps or UI resources.

6. Testing the add-on on a real Alexa+
   - Task: connect my self-hosted MCP server to Alexa+ and test the voice and visual experience end to end.
   - Steps: looked for an Alexa+ developer console, simulator, or device path that accepts a Streamable HTTP MCP URL.
   - Expected vs actual: I expected a way to register the MCP endpoint as an add-on and try it. There is no public Alexa+ developer access for MCP add-ons, and the track guidance is to simulate the Alexa+ experience in a web app.
   - Severity: High (the target platform couldn't be tested directly).
   - Workaround: built an in-app Alexa+ simulator that is a real MCP client of my own server, and used Claude Code and MCP Inspector as stand-in agents against the same endpoint.
   - Suggestion: a text-based Alexa+ sandbox in the developer console that accepts an MCP URL, so builders can check tool selection, spoken replies, and visual rendering before submitting.

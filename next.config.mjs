/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  reactStrictMode: true,
  // Self-contained server bundle for Docker (.next/standalone/server.js).
  output: "standalone",
  // The MCP SDK ships optional transports (Express/stdio) and a JSON-schema
  // validator (ajv) that Next's bundler shouldn't try to inline. Keep the SDK
  // external so the route bundle stays lean and loads it at runtime.
  serverExternalPackages: [
    "@modelcontextprotocol/sdk",
    "@anthropic-ai/sdk",
    "@anthropic-ai/bedrock-sdk",
  ],
};

export default nextConfig;

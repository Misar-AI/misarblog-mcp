#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildServer } from "./server.js";

/**
 * stdio entry point for `@misarblog/mcp`.
 *
 * The tool catalogue, prompts, and resources all come from `buildServer`, which
 * the hosted HTTP endpoint uses too — see src/http.ts. Local-only tools
 * (`login`, `status`, `upload_image`) are registered here and nowhere else.
 */

async function main() {
  const server = buildServer({ includeLocalTools: true });
  await server.connect(new StdioServerTransport());
}

/** Entry point used by Smithery's sandbox scanner, which imports rather than execs. */
export function createSandboxServer() {
  return buildServer({ includeLocalTools: true });
}

/**
 * Auto-start only on a direct run.
 *
 * Smithery's scanner imports this module to enumerate tools; firing main() on
 * import would attach a stdio transport to a process it does not own. Discovery
 * must also never require credentials — buildServer touches none, so
 * `tools/list` answers fine for an unauthenticated scanner.
 */
const argv1 = process.argv[1] ?? "";
const isDirectRun =
  argv1.endsWith("index.ts") || argv1.endsWith("index.js") || argv1.endsWith("misarblog-mcp");
if (isDirectRun) {
  main().catch((err) => {
    console.error("MCP server error:", err);
    process.exit(1);
  });
}

export { buildServer, describeServer, SERVER_NAME, SERVER_VERSION } from "./server.js";
export { PROMPTS, listPrompts, getPrompt } from "./prompts.js";
export { RESOURCES, listResources, readResource } from "./resources.js";
export { createBlogHttpHandler, corsPreflight } from "./http.js";
export { httpContext, runWithContext, type BlogContext } from "./lib/context.js";

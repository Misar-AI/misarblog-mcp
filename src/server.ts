/**
 * The Misar.Blog tool catalogue.
 *
 * {@link buildServer} is the single factory both transports use, so a tool
 * fixed here is fixed everywhere. {@link describeServer} renders the same
 * surface as plain data, for directories that describe the server without
 * connecting to it.
 *
 * @module
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { registerArticleTools } from "./tools/articles.js";
import { registerImageTools } from "./tools/images.js";
import { registerSeriesTools } from "./tools/series.js";
import { registerProfileTools } from "./tools/profile.js";
import { registerLoginTool } from "./tools/login.js";
import { registerUpgradeTool } from "./tools/upgrade.js";
import { registerStatusTool } from "./tools/status.js";
import { registerAiTools } from "./tools/ai.js";
import { registerCommentTools } from "./tools/comments.js";
import { registerFollowTools } from "./tools/follows.js";
import { registerNewsletterTools } from "./tools/newsletter.js";
import { registerReactionTools } from "./tools/reactions.js";

import { PROMPTS } from "./prompts.js";
import { RESOURCES } from "./resources.js";

/** Server id reported by `initialize`, e.g. shown by directories. */
export const SERVER_NAME = "misarblog";
// Keep in step with package.json — this is what `initialize` reports as
// serverInfo.version, and directories display it. It sat at 2.0.0 through four
// releases, so every scanner showed this server three majors behind npm.
/** Package version reported by `initialize`. Keep in step with package.json. */
export const SERVER_VERSION = "5.1.2";

/** Options accepted by {@link buildServer} and {@link describeServer}. */
export interface BuildServerOptions {
  /**
   * Register tools that only make sense on the user's own machine.
   *
   * `login` opens a browser and binds a loopback listener; `status` and
   * `upload_image` read local state and files. On the hosted HTTP endpoint the
   * caller already presents a key and has no local filesystem, so exposing them
   * there would advertise capabilities that cannot work.
   */
  includeLocalTools?: boolean;
}

/**
 * Build the Misar.Blog MCP server.
 *
 * ONE factory for both transports. Previously the stdio package, /api/mcp and
 * /api/v1/mcp each declared their own tool list — 23, 20 and 15 tools
 * respectively, overlapping but never identical — so a tool fixed in one place
 * stayed broken in the other two.
 */
export function buildServer(options: BuildServerOptions = {}): McpServer {
  const { includeLocalTools = false } = options;

  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  if (includeLocalTools) {
    registerLoginTool(server);
    registerStatusTool(server);
  }
  registerUpgradeTool(server);
  registerProfileTools(server);
  registerArticleTools(server);
  registerAiTools(server);
  registerImageTools(server, { includeLocalTools });
  registerSeriesTools(server);
  registerCommentTools(server);
  registerFollowTools(server);
  registerNewsletterTools(server);
  registerReactionTools(server);

  registerPrompts(server);
  registerResources(server);

  return server;
}

function registerPrompts(server: McpServer): void {
  for (const prompt of PROMPTS) {
    // The SDK derives the wire-level argument list from this zod shape, so the
    // required/optional split here is what clients actually render.
    const argsShape: Record<string, z.ZodType> = {};
    for (const arg of prompt.arguments) {
      const base = z.string().describe(arg.description);
      argsShape[arg.name] = arg.required ? base : base.optional();
    }

    server.prompt(prompt.name, prompt.description, argsShape, (args) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: prompt.build((args ?? {}) as Record<string, string>),
          },
        },
      ],
    }));
  }
}

function registerResources(server: McpServer): void {
  for (const resource of RESOURCES) {
    server.resource(
      resource.name,
      resource.uri,
      { description: resource.description, mimeType: resource.mimeType },
      async () => ({
        contents: [
          {
            uri: resource.uri,
            mimeType: resource.mimeType,
            text: JSON.stringify(await resource.read(), null, 2),
          },
        ],
      }),
    );
  }
}

/**
 * A machine-readable summary of what this server offers.
 *
 * Directories and registries read this to describe the server without
 * connecting to it.
 */
export interface ServerDescription {
  /** Server id, e.g. `misarblog`. */
  name: string;
  /** Package version, as reported by `initialize`. */
  version: string;
  /** Transport this server speaks. */
  transport: string;
  /** Every registered tool, with its description. */
  tools: Array<{ name: string; description: string }>;
  /** Every registered prompt, with its description. */
  prompts: Array<{ name: string; description: string }>;
  /** URIs of every registered resource. */
  resources: string[];
  /** How to authenticate, in a form meant for humans. */
  auth: string;
  /** Documentation URL. */
  docs: string;
}

/**
 * Machine-readable summary of the server's surface.
 *
 * Derived from a real `buildServer()` rather than a hand-written list: the
 * previous metadata endpoint on /api/v1/mcp hardcoded 15 tool names and had
 * already drifted from the 20 that route actually served.
 *
 * Reads the SDK's private registries because `McpServer` exposes no public
 * enumeration; the shapes are pinned by the exact-versioned SDK dependency and
 * covered by a test, so a breaking change surfaces at CI rather than in prod.
 */
export function describeServer(options: BuildServerOptions = {}): ServerDescription {
  const server = buildServer(options) as unknown as {
    _registeredTools: Record<string, { description?: string }>;
    _registeredPrompts: Record<string, { description?: string }>;
    _registeredResources: Record<string, { name?: string }>;
  };

  return {
    name: SERVER_NAME,
    version: SERVER_VERSION,
    transport: "streamable-http",
    tools: Object.entries(server._registeredTools ?? {}).map(([name, t]) => ({
      name,
      description: t.description ?? "",
    })),
    prompts: Object.entries(server._registeredPrompts ?? {}).map(([name, p]) => ({
      name,
      description: p.description ?? "",
    })),
    resources: Object.keys(server._registeredResources ?? {}),
    auth: "Bearer mbk_* — Dashboard → Settings → API Keys",
    docs: "https://docs.misar.io/blog",
  };
}

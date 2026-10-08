import { createRequire } from "node:module";
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
import { withUsageFooter } from "./lib/usage.js";

export const SERVER_NAME = "misarblog";
/**
 * Reported by `initialize`. Read from package.json (always shipped by npm, one
 * level above dist/) so it can never drift from the published version again:
 * the hardcoded "2.0.0" outlived several 5.x releases.
 */
export const SERVER_VERSION: string = (
  createRequire(import.meta.url)("../package.json") as { version: string }
).version;

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
/**
 * Append the pre-emptive usage warning to every tool result, once, centrally.
 *
 * This used to be called by hand inside individual tool handlers, and only
 * three of them in tools/articles.ts ever did — so ten other tool groups
 * silently never warned anyone. Wrapping registration means a tool added later
 * inherits it without having to remember.
 *
 * `upgrade` is exempt: it already renders the full quota table, so a footer
 * would repeat what the user is looking at.
 */
function withUsageDrain(server: McpServer): McpServer {
  /**
   * Patch one registration method (`tool` or `registerTool`) with the same
   * generic wrapper.
   *
   * Both methods are positionally generic here: `args[0]` is always the tool
   * name and `args[args.length - 1]` is always the handler, regardless of
   * whether the call is the deprecated `tool(name, description, schema, cb)`
   * shape or `registerTool(name, config, cb)`'s three-argument shape. Tool
   * files register annotations via `registerTool`'s config object, but this
   * wrapper never inspects that object, so it needed no change to keep
   * draining usage footers once tools moved off the deprecated `tool()` call.
   */
  const wrap = (methodName: "tool" | "registerTool") => {
    const target = server as unknown as Record<string, (...a: unknown[]) => unknown>;
    const original = target[methodName].bind(server);

    target[methodName] = (...args: unknown[]) => {
      const name = args[0];
      const last = args.length - 1;
      const handler = args[last];

      if (typeof name === "string" && name !== "upgrade" && typeof handler === "function") {
        const fn = handler as (...h: unknown[]) => Promise<unknown>;
        args[last] = async (...hargs: unknown[]) => {
          const result = (await fn(...hargs)) as {
            content?: { type?: string; text?: string }[];
            isError?: boolean;
          };
          // Never decorate a failure: the error path already carries the full
          // upgrade card when the block was a plan limit.
          if (result?.isError) return result;
          const first = result?.content?.[0];
          if (first?.type === "text" && typeof first.text === "string") {
            const next = withUsageFooter(first.text);
            if (next !== first.text) {
              return { ...result, content: [{ ...first, text: next }, ...result.content!.slice(1)] };
            }
          }
          return result;
        };
      }
      return original(...args);
    };
  };

  wrap("tool");
  wrap("registerTool");

  return server;
}

export function buildServer(options: BuildServerOptions = {}): McpServer {
  const { includeLocalTools = false } = options;

  const server = withUsageDrain(new McpServer({ name: SERVER_NAME, version: SERVER_VERSION }));

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
export function describeServer(options: BuildServerOptions = {}) {
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
    docs: "https://docs.misar.io/blog/mcp",
  };
}

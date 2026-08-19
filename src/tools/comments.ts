import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiFetch } from "../lib/api-client.js";
import { formatError } from "../lib/errors.js";

/**
 * Comment tools.
 *
 * These call `api.misar.io/blog/v1/comments` through the shared client, like
 * every other tool. They previously fetched `misar.blog/api/comments` directly —
 * the browser endpoint, gated only by an IP rate limit — so the tool answered
 * with no API key and consumed no quota. That is the one thing an MCP tool must
 * never do: read the platform outside the metered, versioned API.
 */
export function registerCommentTools(server: McpServer): void {
  server.registerTool(
    "list_comments",
    {
      title: "List article comments",
      description:
        "Read the comment thread on one article, oldest first, paginated.\n\n" +
        "Use it to review reader feedback or summarise a discussion. It reads comments only; " +
        "there is no tool here for posting or moderating a reply.\n\n" +
        "Reads only. Requires an API key and counts against the plan's request quota. Page " +
        "through with limit and offset — the default returns the first 20. Returns the " +
        "comments with their authors and timestamps; an empty list simply means no comments " +
        "yet, which is not an error.",
      inputSchema: {
        article_id: z
          .string()
          .uuid()
          .describe(
            "UUID of the article, as returned in the `id` field by article tools. Not the slug.",
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .default(20)
          .describe("Comments per page, 1-100. Defaults to 20."),
        offset: z
          .number()
          .int()
          .min(0)
          .optional()
          .default(0)
          .describe("Comments to skip before this page. Defaults to 0."),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ article_id, limit, offset }) => {
      try {
        const qs = new URLSearchParams({
          article_id,
          limit: String(limit),
          offset: String(offset),
        });
        const data = await apiFetch(`/comments?${qs}`);
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: "text" as const, text: formatError(e) }], isError: true };
      }
    }
  );
}

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
  server.tool(
    "list_comments",
    "Get the comment thread for an article. Requires an API key; counts against your plan's request quota.",
    {
      article_id: z.string().uuid().describe("UUID of the article to fetch comments for"),
      limit: z.number().int().min(1).max(100).optional().default(20),
      offset: z.number().int().min(0).optional().default(0),
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

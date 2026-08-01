import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { formatError } from "../lib/errors.js";

const SITE_URL = (process.env.MISARBLOG_SITE_URL ?? "https://www.misar.blog").replace(/\/$/, "");

export function registerCommentTools(server: McpServer): void {
  server.tool(
    "list_comments",
    "Get public comments for an article. Rate-limited by IP — no API key required.",
    {
      article_id: z.string().uuid().describe("UUID of the article to fetch comments for"),
      limit: z.number().int().min(1).max(100).optional().default(20),
      offset: z.number().int().min(0).optional().default(0),
    },
    async ({ article_id, limit, offset }) => {
      try {
        const qs = new URLSearchParams({ article_id, limit: String(limit), offset: String(offset) });
        const res = await fetch(`${SITE_URL}/api/comments?${qs}`, {
          headers: { Accept: "application/json" },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return { content: [{ type: "text" as const, text: `Error ${res.status}: ${JSON.stringify(data)}` }], isError: true };
        }
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: "text" as const, text: formatError(e) }], isError: true };
      }
    }
  );
}

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiFetch } from "../lib/api-client.js";
import { formatError } from "../lib/errors.js";

export function registerNewsletterTools(server: McpServer): void {
  server.tool(
    "list_newsletter_subscribers",
    "Get your newsletter subscriber list. Requires API key authentication.",
    {
      limit: z.number().int().min(1).max(100).optional().default(20),
      offset: z.number().int().min(0).optional().default(0),
    },
    async ({ limit, offset }) => {
      try {
        const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) });
        const data = await apiFetch<unknown>(`/newsletter/subscribers?${qs}`);
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: "text" as const, text: formatError(e) }], isError: true };
      }
    }
  );

  server.tool(
    "list_newsletter_issues",
    "Get your sent and scheduled newsletter issues. Requires API key authentication.",
    { limit: z.number().int().min(1).max(50).optional().default(10) },
    async ({ limit }) => {
      try {
        const data = await apiFetch<unknown>(`/newsletter/issues?limit=${limit}`);
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: "text" as const, text: formatError(e) }], isError: true };
      }
    }
  );
}

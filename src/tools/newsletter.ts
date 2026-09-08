import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiFetch } from "../lib/api-client.js";
import { formatError } from "../lib/errors.js";

export function registerNewsletterTools(server: McpServer): void {
  server.registerTool(
    "list_newsletter_subscribers",
    {
      title: "List subscribers",
      description: "Get your newsletter subscriber list. Requires API key authentication.",
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional().default(20),
        offset: z.number().int().min(0).optional().default(0),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
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

  server.registerTool(
    "list_newsletter_issues",
    {
      title: "List newsletter issues",
      description: "Get your sent and scheduled newsletter issues. Requires API key authentication.",
      inputSchema: { limit: z.number().int().min(1).max(50).optional().default(10) },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
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

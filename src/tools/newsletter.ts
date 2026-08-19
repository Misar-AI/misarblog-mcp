import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiFetch } from "../lib/api-client.js";
import { formatError } from "../lib/errors.js";

export function registerNewsletterTools(server: McpServer): void {
  server.registerTool(
    "list_newsletter_subscribers",
    {
      title: "List newsletter subscribers",
      description:
        "List the people subscribed to the authenticated account's newsletter, paginated.\n\n" +
        "Use it to size the audience or export the list. For what has been SENT to them, use " +
        "list_newsletter_issues instead.\n\n" +
        "Reads only — no email is sent and no subscriber is added or removed. Requires an API " +
        "key. This returns personal data (email addresses), so treat the result as " +
        "confidential and do not echo it into shared transcripts. Page with limit and offset; " +
        "the default returns the first 20.",
      inputSchema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .default(20)
          .describe("Subscribers per page, 1-100. Defaults to 20."),
        offset: z
          .number()
          .int()
          .min(0)
          .optional()
          .default(0)
          .describe("Subscribers to skip before this page. Defaults to 0."),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
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
      description:
        "List newsletter issues the account has sent or scheduled, newest first.\n\n" +
        "Use it to check what went out and when, or to confirm a scheduled send exists before " +
        "queueing another. For WHO receives them, use list_newsletter_subscribers.\n\n" +
        "Reads only — this neither sends nor cancels an issue. Requires an API key. Returns " +
        "each issue with its subject, status and send time. An empty list means nothing has " +
        "been sent yet, which is not an error.",
      inputSchema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .default(10)
          .describe("Issues to return, 1-50, newest first. Defaults to 10."),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
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

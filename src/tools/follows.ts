import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiFetch } from "../lib/api-client.js";
import { formatError } from "../lib/errors.js";

/**
 * Follow tools.
 *
 * Routed through `api.misar.io/blog/v1/follows` via the shared client. See
 * `comments.ts` for why: the previous implementation called the browser
 * endpoint `misar.blog/api/follows` directly and was therefore unauthenticated
 * and unmetered.
 */
export function registerFollowTools(server: McpServer): void {
  server.registerTool(
    "get_follow_status",
    {
      title: "Follow status",
      description: "Get follow status and follower count for a profile UUID. Requires an API key; counts against your plan's request quota.",
      inputSchema: {
        user_id: z.string().uuid().describe("UUID of the profile to check follow status for"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ user_id }) => {
      try {
        const data = await apiFetch(`/follows?user_id=${encodeURIComponent(user_id)}`);
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: "text" as const, text: formatError(e) }], isError: true };
      }
    }
  );
}

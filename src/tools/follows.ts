import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { formatError } from "../lib/errors.js";

const SITE_URL = (process.env.MISARBLOG_SITE_URL ?? "https://www.misar.blog").replace(/\/$/, "");

export function registerFollowTools(server: McpServer): void {
  server.tool(
    "get_follow_status",
    "Get public follow status and follower count for a user by their profile UUID. No API key required.",
    { user_id: z.string().uuid().describe("UUID of the profile to check follow status for") },
    async ({ user_id }) => {
      try {
        const res = await fetch(`${SITE_URL}/api/follows?user_id=${encodeURIComponent(user_id)}`, {
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

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
      title: "Get follow status",
      description:
        "Check whether the authenticated account follows a given profile, and how many " +
        "followers that profile has.\n\n" +
        "Use it before offering to follow someone, so you do not suggest an action that is " +
        "already done. It answers about ONE profile identified by UUID — there is no tool " +
        "here that lists everyone you follow.\n\n" +
        "Reads only; following state is not changed. Requires an API key and counts against " +
        "the plan's request quota. Returns the follow relationship and follower count. " +
        "Errors if the UUID does not match a profile.",
      inputSchema: {
        user_id: z
          .string()
          .uuid()
          .describe(
            "UUID of the profile to check, as returned in author fields by article tools. " +
              "Not the username.",
          ),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
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

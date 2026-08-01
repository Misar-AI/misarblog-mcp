import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiFetch } from "../lib/api-client.js";
import { formatError } from "../lib/errors.js";

const REACTION_TYPES = ["like", "clap", "bookmark"] as const;

export function registerReactionTools(server: McpServer): void {
  server.tool(
    "get_reactions",
    "Get reaction counts and your reactions for an article. Requires API key.",
    {
      article_id: z.string().uuid().describe("UUID of the article"),
    },
    async ({ article_id }) => {
      try {
        const data = await apiFetch(`/reactions?article_id=${encodeURIComponent(article_id)}`);
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: "text" as const, text: formatError(e) }], isError: true };
      }
    }
  );

  server.tool(
    "add_reaction",
    "Add a reaction to an article. No-ops if already reacted. Requires API key.",
    {
      article_id: z.string().uuid().describe("UUID of the article"),
      type: z.enum(REACTION_TYPES).describe("Reaction type: like, clap, or bookmark"),
    },
    async ({ article_id, type }) => {
      try {
        const data = await apiFetch("/reactions", {
          method: "POST",
          body: JSON.stringify({ article_id, type }),
        });
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: "text" as const, text: formatError(e) }], isError: true };
      }
    }
  );

  server.tool(
    "remove_reaction",
    "Remove a specific reaction from an article. Requires API key.",
    {
      article_id: z.string().uuid().describe("UUID of the article"),
      type: z.enum(REACTION_TYPES).describe("Reaction type to remove: like, clap, or bookmark"),
    },
    async ({ article_id, type }) => {
      try {
        const qs = new URLSearchParams({ article_id, type });
        const data = await apiFetch(`/reactions?${qs}`, { method: "DELETE" });
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: "text" as const, text: formatError(e) }], isError: true };
      }
    }
  );
}

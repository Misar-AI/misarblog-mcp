import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiFetch } from "../lib/api-client.js";
import { formatError } from "../lib/errors.js";

const REACTION_TYPES = ["like", "clap", "bookmark"] as const;

export function registerReactionTools(server: McpServer): void {
  server.registerTool(
    "get_reactions",
    {
      title: "Get reactions",
      description: "Get reaction counts and your reactions for an article. Requires API key.",
      inputSchema: {
        article_id: z.string().uuid().describe("UUID of the article"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
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

  server.registerTool(
    "add_reaction",
    {
      title: "Add reaction",
      description: "Add a reaction to an article. No-ops if already reacted. Requires API key.",
      inputSchema: {
        article_id: z.string().uuid().describe("UUID of the article"),
        type: z.enum(REACTION_TYPES).describe("Reaction type: like, clap, or bookmark"),
      },
      annotations: {
        // No-ops if the reaction already exists, so repeating it leaves the
        // same end state. It posts publicly as the account holder — the
        // reaction is visible to anyone reading the article, like a public
        // count of claps or likes.
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
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

  server.registerTool(
    "remove_reaction",
    {
      title: "Remove reaction",
      description: "Remove a specific reaction from an article. Requires API key.",
      inputSchema: {
        article_id: z.string().uuid().describe("UUID of the article"),
        type: z.enum(REACTION_TYPES).describe("Reaction type to remove: like, clap, or bookmark"),
      },
      annotations: {
        // Deletes an existing reaction record, which is what makes this
        // destructive even though it is trivially reversible (react again to
        // undo) and changes the same public counters add_reaction does.
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
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

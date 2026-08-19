import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiFetch } from "../lib/api-client.js";
import { formatError } from "../lib/errors.js";

const REACTION_TYPES = ["like", "clap", "bookmark"] as const;

export function registerReactionTools(server: McpServer): void {
  server.registerTool(
    "get_reactions",
    {
      title: "Get article reactions",
      description:
        "Read the reaction totals on one article, plus which reactions the authenticated " +
        "account has left on it.\n\n" +
        "Use it before add_reaction or remove_reaction so you know the current state — it is " +
        "how you tell 'not yet liked' from 'already liked'. Covers one article at a time.\n\n" +
        "Reads only; no reaction is added or removed. Requires an API key. Returns counts per " +
        "type (like, clap, bookmark) alongside the caller's own reactions. Zero counts are a " +
        "real answer, not an error.",
      inputSchema: {
        article_id: z
          .string()
          .uuid()
          .describe("UUID of the article, from the `id` field returned by article tools."),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
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
      title: "Add a reaction",
      description:
        "Record one reaction — like, clap, or bookmark — from the authenticated account on " +
        "an article.\n\n" +
        "This acts publicly as the account holder, so only call it when the user has actually " +
        "asked to react; do not react on their behalf to be helpful. Adds a single type per " +
        "call — react twice for two types.\n\n" +
        "Safe to repeat: if the reaction already exists the call succeeds and changes nothing, " +
        "so it will not double-count. Requires an API key. Use remove_reaction to undo, and " +
        "get_reactions to see the resulting totals.",
      inputSchema: {
        article_id: z
          .string()
          .uuid()
          .describe("UUID of the article to react to, from the `id` field of article tools."),
        type: z
          .enum(REACTION_TYPES)
          .describe(
            "Which reaction to add: 'like' approval, 'clap' stronger approval, 'bookmark' " +
              "save for later.",
          ),
      },
      annotations: {
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
      title: "Remove a reaction",
      description:
        "Withdraw one reaction the authenticated account previously left on an article.\n\n" +
        "Removes exactly the type you name and leaves the account's other reactions on that " +
        "article intact — removing 'like' does not remove a 'bookmark'. Nothing else is " +
        "deleted: the article and its comments are untouched.\n\n" +
        "Safe to repeat: removing a reaction that is not there succeeds and changes nothing. " +
        "Requires an API key. Call get_reactions first if you need to know what is currently " +
        "set.",
      inputSchema: {
        article_id: z
          .string()
          .uuid()
          .describe("UUID of the article to un-react to, from the `id` field of article tools."),
        type: z
          .enum(REACTION_TYPES)
          .describe("Which reaction to withdraw: 'like', 'clap', or 'bookmark'."),
      },
      annotations: {
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

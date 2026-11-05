import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiFetch } from "../lib/api-client.js";
import { formatError } from "../lib/errors.js";

/**
 * Social tools: upvotes, saved articles, reputation and reposts.
 *
 * These replace the reaction tools (see reactions.ts): misar.blog moved from
 * like/clap/bookmark reactions to upvotes and saves, and added reputation and
 * reposts. Every call goes through the shared API-key client, so each one is
 * authenticated and counts against the plan's request quota.
 *
 * Request and response shapes mirror the MisarBlog v1 route handlers
 * (`src/app/api/v1/{upvotes,saved,reputation/[username],reposts}/route.ts`).
 */

/** Matches the server's limit (REPOST_NOTE_MAX in MisarBlog lib/social/reposts). */
export const REPOST_NOTE_MAX = 280;

/** Matches the reputation route's username pattern, with an optional leading "@". */
const USERNAME_RE = /^@?[a-zA-Z0-9_.-]{1,64}$/;

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

async function run(call: () => Promise<unknown>): Promise<ToolResult> {
  try {
    const data = await call();
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  } catch (e) {
    return { content: [{ type: "text" as const, text: formatError(e) }], isError: true };
  }
}

const articleId = z.string().uuid().describe("UUID of the article");

export function registerSocialTools(server: McpServer): void {
  // ─── Upvotes ──────────────────────────────────────────────────────────────

  server.registerTool(
    "upvote_article",
    {
      title: "Upvote article",
      description:
        "Upvote an article as the account holder. Idempotent: upvoting again changes nothing. " +
        "Returns {upvoted, upvote_count}. Requires an API key; counts against your plan's request quota.",
      inputSchema: { article_id: articleId },
      annotations: {
        // Public and visible to the author and readers, but repeating it
        // leaves the same end state.
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ article_id }) =>
      run(() => apiFetch("/upvotes", { method: "POST", body: JSON.stringify({ article_id }) })),
  );

  server.registerTool(
    "remove_upvote",
    {
      title: "Remove upvote",
      description:
        "Remove your upvote from an article. Returns {upvoted: false, upvote_count}. " +
        "Requires an API key; counts against your plan's request quota.",
      inputSchema: { article_id: articleId },
      annotations: {
        // Deletes the upvote record (undo by upvoting again).
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ article_id }) =>
      run(() =>
        apiFetch(`/upvotes?${new URLSearchParams({ article_id })}`, { method: "DELETE" }),
      ),
  );

  // ─── Saved ────────────────────────────────────────────────────────────────

  server.registerTool(
    "save_article",
    {
      title: "Save article",
      description:
        "Save an article to your saved list to read later. Idempotent. Returns {saved, save_count}. " +
        "Requires an API key; counts against your plan's request quota.",
      inputSchema: { article_id: articleId },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ article_id }) =>
      run(() => apiFetch("/saved", { method: "POST", body: JSON.stringify({ article_id }) })),
  );

  server.registerTool(
    "unsave_article",
    {
      title: "Unsave article",
      description:
        "Remove an article from your saved list. Returns {saved: false, save_count}. " +
        "Requires an API key; counts against your plan's request quota.",
      inputSchema: { article_id: articleId },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ article_id }) =>
      run(() => apiFetch(`/saved?${new URLSearchParams({ article_id })}`, { method: "DELETE" })),
  );

  server.registerTool(
    "list_saved",
    {
      title: "List saved articles",
      description:
        "List your saved articles, newest save first. Returns {items, next_cursor}; pass next_cursor " +
        "back as cursor for the next page. Requires an API key; counts against your plan's request quota.",
      inputSchema: {
        cursor: z.string().max(200).optional().describe("next_cursor from the previous page"),
        limit: z.number().int().min(1).max(50).optional().default(20).describe("Page size, 1-50"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ cursor, limit }) => {
      const qs = new URLSearchParams({ limit: String(limit ?? 20) });
      if (cursor) qs.set("cursor", cursor);
      return run(() => apiFetch(`/saved?${qs}`));
    },
  );

  // ─── Reputation ───────────────────────────────────────────────────────────

  server.registerTool(
    "get_reputation",
    {
      title: "Get reputation",
      description:
        "Get a creator's reputation: score, tier and tier name, upvotes received, progress toward the " +
        "next tier, and badges. Requires an API key; counts against your plan's request quota.",
      inputSchema: {
        username: z
          .string()
          .regex(USERNAME_RE, "Invalid username")
          .describe("Username of the creator, with or without a leading @"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ username }) =>
      run(() => apiFetch(`/reputation/${encodeURIComponent(username.replace(/^@/, ""))}`)),
  );

  // ─── Reposts ──────────────────────────────────────────────────────────────

  server.registerTool(
    "repost_article",
    {
      title: "Repost article",
      description:
        "Repost an article to your followers, with an optional note (up to 280 characters). " +
        "Needs reputation tier 1; you cannot repost your own article; notes are moderated. " +
        "Reposting again replaces the note. Returns {reposted, repost_count}. " +
        "Requires an API key; counts against your plan's request quota.",
      inputSchema: {
        article_id: articleId,
        note: z
          .string()
          .trim()
          .max(REPOST_NOTE_MAX, `Note must be ${REPOST_NOTE_MAX} characters or fewer`)
          .optional()
          .describe(`Optional note shown with the repost, up to ${REPOST_NOTE_MAX} characters`),
      },
      annotations: {
        // Public as the account holder. Idempotent on the repost itself; a
        // repeat with a different note replaces the note.
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ article_id, note }) =>
      run(() =>
        apiFetch("/reposts", {
          method: "POST",
          body: JSON.stringify(note ? { article_id, note } : { article_id }),
        }),
      ),
  );

  server.registerTool(
    "remove_repost",
    {
      title: "Remove repost",
      description:
        "Undo your repost of an article. Returns {reposted: false, repost_count}. " +
        "Requires an API key; counts against your plan's request quota.",
      inputSchema: { article_id: articleId },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    // The v1 route reads the article id from the JSON body, not the query.
    async ({ article_id }) =>
      run(() => apiFetch("/reposts", { method: "DELETE", body: JSON.stringify({ article_id }) })),
  );
}

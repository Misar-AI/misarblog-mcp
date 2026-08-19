import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiFetch } from "../lib/api-client.js";
import { formatError } from "../lib/errors.js";
import { withUsageFooter } from "../lib/usage.js";

interface Article {
  id: string;
  slug: string;
  title: string;
  status: string;
  url: string;
  editor_url?: string;
  published_at: string | null;
  created_at: string;
  content_markdown?: string;
  tags?: string[];
}

export function registerArticleTools(server: McpServer) {
  server.registerTool(
    "list_my_articles",
    {
      title: "List my articles",
      description:
        "List articles owned by the authenticated account, newest first, including drafts " +
        "and scheduled posts.\n\n" +
        "Use this to find your own work — it is the only listing that sees unpublished " +
        "content. To search across the whole site, including other creators, use " +
        "search_articles instead.\n\n" +
        "Reads only; nothing is created or modified. Requires an API key. Returns " +
        "`{ articles, total }`, where each article carries id, slug, title, status, url, " +
        "editor_url, tags and timestamps, but NOT the article body — call get_article for " +
        "that. `total` counts all matches, not just the page returned.",
      inputSchema: {
        status: z
          .enum(["draft", "published", "scheduled", "archived"])
          .optional()
          .describe(
            "Return only articles in this state. Omit to return every state the account owns.",
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(20)
          .describe("Maximum articles to return, 1-100. Defaults to 20."),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ status, limit }) => {
      try {
        const qs = new URLSearchParams({ limit: String(limit) });
        if (status) qs.set("status", status);
        const data = await apiFetch<{ articles: Article[]; total: number }>(`/articles?${qs}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "get_article",
    {
      title: "Get one article",
      description:
        "Fetch a single article by slug, including its full Markdown body.\n\n" +
        "Use this after list_my_articles or search_articles has given you a slug and you " +
        "need the actual content — for reading, editing, or repurposing it. Fetching one " +
        "article at a time is deliberate: the listing tools omit bodies so they stay cheap.\n\n" +
        "Reads only; nothing is created or modified. Requires an API key for unpublished " +
        "articles; published ones are readable without. Returns the article object with " +
        "content_markdown populated. Errors if the slug does not exist or the account " +
        "cannot see it.",
      inputSchema: {
        slug: z
          .string()
          .describe(
            "URL slug of the article, e.g. 'how-we-cut-build-times'. Not the numeric id, " +
              "and not the full URL.",
          ),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ slug }) => {
      try {
        const article = await apiFetch<Article>(`/articles/${encodeURIComponent(slug)}`);
        return { content: [{ type: "text", text: JSON.stringify(article, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "publish_article",
    {
      title: "Publish an article",
      description:
        "Create a new article and make it live immediately, or schedule it for a future " +
        "time.\n\n" +
        "This PUBLISHES: without schedule_at the article is world-readable the moment this " +
        "returns, at the visibility you choose. If the piece is not ready, use create_draft " +
        "instead and publish later. Each call creates a NEW article — it is not idempotent, " +
        "so calling twice publishes twice; use update_article to change one that exists.\n\n" +
        "Requires an API key and consumes one publish from the account's plan quota; the " +
        "response warns when the allowance is nearly spent. Returns the created article " +
        "with its public url and editor_url.",
      inputSchema: {
        title: z.string().min(1).max(250).describe("Headline, 1-250 characters."),
        body_markdown: z
          .string()
          .min(1)
          .describe("Complete article body as Markdown. Images may be referenced by URL."),
        tags: z
          .array(z.string())
          .max(10)
          .optional()
          .describe("Up to 10 topic tags used for discovery and filtering."),
        cover_image_url: z
          .string()
          .url()
          .optional()
          .describe(
            "Absolute URL of the hero image. generate_cover_image returns a URL suitable here.",
          ),
        schedule_at: z
          .string()
          .optional()
          .describe(
            "ISO 8601 timestamp to publish at, e.g. '2026-09-01T09:00:00Z'. Omit to publish " +
              "immediately. A past timestamp publishes immediately.",
          ),
        visibility: z
          .enum(["public", "subscribers", "paid", "private"])
          .default("public")
          .describe(
            "Audience: 'public' anyone, 'subscribers' newsletter subscribers, 'paid' paying " +
              "members, 'private' only you. Defaults to 'public'.",
          ),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const article = await apiFetch<Article>("/articles", {
          method: "POST",
          body: JSON.stringify(args),
        });
        const action = args.schedule_at ? "scheduled" : "published";
        return {
          content: [
            {
              type: "text",
              // withUsageFooter appends the 80% allowance warning when the
              // caller is close to their limit — and nothing otherwise.
              text: withUsageFooter(
                `Article ${action} successfully!\n\nURL: ${article.url}\nEditor: ${article.editor_url}\n\n${JSON.stringify(article, null, 2)}`,
              ),
            },
          ],
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "create_draft",
    {
      title: "Create a draft",
      description:
        "Save an article as an unpublished draft.\n\n" +
        "Nothing becomes visible to readers: use this whenever the work still needs review, " +
        "and publish_article only when it should go live. The draft can be edited afterwards " +
        "with update_article.\n\n" +
        "Each call creates a NEW draft — not idempotent, so calling twice leaves two drafts. " +
        "Requires an API key. Returns the draft with an editor_url for finishing it in the " +
        "browser.",
      inputSchema: {
        title: z.string().min(1).describe("Working headline. Can be changed before publishing."),
        body_markdown: z.string().min(1).describe("Article body so far, as Markdown."),
        tags: z.array(z.string()).optional().describe("Topic tags to carry through to publication."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const draft = await apiFetch<Article>("/drafts", {
          method: "POST",
          body: JSON.stringify(args),
        });
        return {
          content: [
            {
              type: "text",
              text: withUsageFooter(
                `Draft saved!\n\nEditor: ${draft.editor_url}\n\n${JSON.stringify(draft, null, 2)}`,
              ),
            },
          ],
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "update_article",
    {
      title: "Update an article",
      description:
        "Change the title, body, or tags of an article or draft that already exists.\n\n" +
        "Only the fields you pass are touched; omitted fields keep their current values. " +
        "Passing `tags` REPLACES the whole tag list rather than adding to it, so send the " +
        "full set you want. Editing a published article changes what readers see " +
        "immediately; it does not unpublish or re-date it.\n\n" +
        "Safe to repeat: the same call twice leaves the same result. Requires an API key, " +
        "and the account must own the article. Errors if no updatable field is supplied. " +
        "Returns the updated article.",
      inputSchema: {
        id: z
          .string()
          .min(1)
          .describe("Article or draft id from a listing tool. This is the id, not the slug."),
        title: z.string().min(1).max(500).optional().describe("Replacement headline."),
        body_markdown: z
          .string()
          .min(1)
          .optional()
          .describe("Replacement body as Markdown. Replaces the whole body, not a patch."),
        tags: z
          .array(z.string())
          .max(10)
          .optional()
          .describe("Replacement tag list, up to 10. Overwrites the existing tags entirely."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id, ...fields }) => {
      try {
        // Send only the provided fields — a PATCH carrying explicit undefineds
        // serialises them away, but an explicit null would clear the column.
        const body = Object.fromEntries(
          Object.entries(fields).filter(([, v]) => v !== undefined)
        );
        if (Object.keys(body).length === 0) {
          return {
            content: [{ type: "text", text: "Nothing to update — pass at least one of title, body_markdown, or tags." }],
            isError: true,
          };
        }
        const article = await apiFetch<Article>(`/articles/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        return {
          content: [{ type: "text", text: withUsageFooter(JSON.stringify(article, null, 2)) }],
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "search_articles",
    {
      title: "Search published articles",
      description:
        "Search PUBLISHED articles across all of Misar.Blog, including other creators' work.\n\n" +
        "Use this for discovery, research, and competitive reading. It never returns drafts, " +
        "scheduled, or private posts — not even your own — so reach for list_my_articles when " +
        "you want your unpublished work.\n\n" +
        "Reads only. No API key required; unauthenticated callers are rate-limited by IP. " +
        "Filters combine with AND. Returns an array of article summaries without bodies; " +
        "pass a slug to get_article for the full text. An empty array means no matches, " +
        "which is not an error.",
      inputSchema: {
        q: z
          .string()
          .min(2)
          .optional()
          .describe("Free-text query matched against title and body. Minimum 2 characters."),
        tag: z.string().optional().describe("Restrict to articles carrying this exact tag."),
        author: z.string().optional().describe("Restrict to one author, by username."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(20)
          .default(10)
          .describe("Maximum results to return, 1-20. Defaults to 10."),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ q, tag, author, limit }) => {
      try {
        const qs = new URLSearchParams({ type: "articles", limit: String(limit) });
        if (q) qs.set("q", q);
        if (tag) qs.set("tag", tag);
        if (author) qs.set("author", author);
        const data = await apiFetch<{ articles?: unknown[] }>(`/search?${qs}`);
        return { content: [{ type: "text", text: JSON.stringify(data.articles ?? [], null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );
}

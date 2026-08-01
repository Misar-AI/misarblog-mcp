import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiFetch } from "../lib/api-client.js";
import { formatError } from "../lib/errors.js";

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
  server.tool(
    "list_my_articles",
    "List your articles on Misar.Blog",
    {
      status: z
        .enum(["draft", "published", "scheduled", "archived"])
        .optional()
        .describe("Filter by status (omit for all published)"),
      limit: z.number().int().min(1).max(100).default(20).describe("Number of articles to return"),
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

  server.tool(
    "get_article",
    "Get a single article by slug, including full markdown content",
    { slug: z.string().describe("The article slug") },
    async ({ slug }) => {
      try {
        const article = await apiFetch<Article>(`/articles/${encodeURIComponent(slug)}`);
        return { content: [{ type: "text", text: JSON.stringify(article, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );

  server.tool(
    "publish_article",
    "Publish a new article (or schedule it) on Misar.Blog",
    {
      title: z.string().min(1).max(250).describe("Article title"),
      body_markdown: z.string().min(1).describe("Full article body in Markdown"),
      tags: z.array(z.string()).max(10).optional().describe("Up to 10 tags"),
      cover_image_url: z.string().url().optional().describe("URL of the cover image"),
      schedule_at: z
        .string()
        .optional()
        .describe("ISO 8601 timestamp to schedule. Omit to publish immediately."),
      visibility: z
        .enum(["public", "subscribers", "paid", "private"])
        .default("public")
        .describe("Who can read this article"),
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
              text: `Article ${action} successfully!\n\nURL: ${article.url}\nEditor: ${article.editor_url}\n\n${JSON.stringify(article, null, 2)}`,
            },
          ],
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );

  server.tool(
    "create_draft",
    "Save an article as a draft on Misar.Blog (for review before publishing)",
    {
      title: z.string().min(1).describe("Draft title"),
      body_markdown: z.string().min(1).describe("Full article body in Markdown"),
      tags: z.array(z.string()).optional().describe("Tags for the draft"),
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
              text: `Draft saved!\n\nEditor: ${draft.editor_url}\n\n${JSON.stringify(draft, null, 2)}`,
            },
          ],
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );

  server.tool(
    "update_article",
    "Update the title, body, or tags of an existing article or draft. Only the fields you pass are changed; omitted fields keep their current values.",
    {
      id: z.string().min(1).describe("Article or draft ID"),
      title: z.string().min(1).max(500).optional().describe("New title"),
      body_markdown: z.string().min(1).optional().describe("New body in Markdown"),
      tags: z.array(z.string()).max(10).optional().describe("Replace the tag list"),
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
        return { content: [{ type: "text", text: JSON.stringify(article, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );

  server.tool(
    "search_articles",
    "Search PUBLISHED articles across Misar.Blog by keyword, tag, or author — including other creators' work. Use list_my_articles for your own drafts and unpublished posts.",
    {
      q: z.string().min(2).optional().describe("Keyword query (min 2 characters)"),
      tag: z.string().optional().describe("Filter by tag"),
      author: z.string().optional().describe("Filter by author username"),
      limit: z.number().int().min(1).max(20).default(10).describe("Results to return (1-20)"),
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

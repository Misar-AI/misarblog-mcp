import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiFetch } from "../lib/api-client.js";
import { formatError } from "../lib/errors.js";

interface TitleResult {
  title: string;
  hint: string;
}

interface TitlesResponse {
  titles: TitleResult[];
  raw: string;
}

function formatTitles(titles: TitleResult[]): string {
  if (titles.length === 0) return "No titles were generated.";
  return titles
    .map((t, i) => {
      const hint = t.hint ? `\n   → ${t.hint}` : "";
      return `${i + 1}. ${t.title}${hint}`;
    })
    .join("\n\n");
}

export function registerAiTools(server: McpServer) {
  server.registerTool(
    "research_topic",
    {
      title: "Research a topic",
      description:
        "Research a topic with AI and return insights, sources, and a suggested content " +
        "outline.\n\n" +
        "Use it at the START of a piece, before drafting — it produces raw material to write " +
        "from, not a finished article and not a title. For titles use generate_title_seo; to " +
        "see what already exists on Misar.Blog use search_articles.\n\n" +
        "Nothing is saved: no draft, article, or file is created, and calling it has no " +
        "effect on the blog. Requires an API key and consumes AI credits from the account's " +
        "plan, so each call costs whether or not you use the output. Runs noticeably longer " +
        "than a plain read, and being generative, two identical calls give different text. " +
        "Returns prose to read, not structured JSON — verify any factual claims it makes.",
      inputSchema: {
        query: z
          .string()
          .min(5)
          .max(500)
          .describe(
            "The topic or question to research, 5-500 characters. Specific beats broad: " +
              "'how small SaaS teams price annual plans' returns more than 'pricing'.",
          ),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ query }) => {
      try {
        const data = await apiFetch<{ result?: string; error?: string }>("/ai/research", {
          method: "POST",
          body: JSON.stringify({ query }),
        });
        return {
          content: [
            {
              type: "text",
              text: data.result ?? JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "generate_title_seo",
    {
      title: "Generate SEO titles from keywords",
      description:
        "Generate 5 search-optimised article titles from a TOPIC OR KEYWORD, each with a " +
        "keyword-strategy hint. Aims at high-volume, low-competition long-tail phrases and " +
        "at AI answer engines (ChatGPT, Perplexity, Claude) as well as Google.\n\n" +
        "Pick between the two title tools by what you have in hand: use this one when you " +
        "have a topic or keywords and the article may not be written yet. Use suggest_titles " +
        "when the draft already exists and you want titles drawn from its actual text. " +
        "Passing `context` here does not make them equivalent — this one still optimises for " +
        "the keywords you supply.\n\n" +
        "Nothing is saved and no article is created or retitled; use update_article to apply " +
        "a title. Requires an API key and consumes AI credits per call. Generative, so " +
        "repeated calls return different titles.",
      inputSchema: {
        prompt: z
          .string()
          .min(3)
          .max(500)
          .describe(
            "Topic or target keywords, 3-500 characters. Include niche, audience and any " +
              "long-tail phrase you want to rank for, e.g. 'best AI writing tools for " +
              "beginner bloggers 2025'.",
          ),
        context: z
          .string()
          .max(8000)
          .optional()
          .describe(
            "Optional draft text (plain or Markdown, up to 8000 chars) so the titles match " +
              "what the article actually says. Titles still follow `prompt` for keywords.",
          ),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ prompt, context }) => {
      try {
        const data = await apiFetch<TitlesResponse>("/ai/titles", {
          method: "POST",
          body: JSON.stringify({ action: "seo", prompt, context }),
        });

        const formatted = formatTitles(data.titles);
        return {
          content: [
            {
              type: "text",
              text: `## SEO/AEO/GEO Title Suggestions\n\nOptimized for: Google · AI answer engines (AEO) · Google AI Overviews (GEO) · AI search experiences (ASX)\nKeyword strategy: high-volume, low-competition long-tail phrases\n\n${formatted}\n\n---\n*Click any title to use it. Each title targets a distinct keyword angle and search intent.*`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${formatError(err)}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "suggest_titles",
    {
      title: "Suggest titles from draft text",
      description:
        "Generate 5 title options FROM AN EXISTING DRAFT, derived from what the article " +
        "actually says.\n\n" +
        "Pick between the two title tools by what you have in hand: use this one when the " +
        "text exists and should drive the headline. Use generate_title_seo when you are " +
        "starting from a topic or keyword, or want titles aimed at specific search terms — " +
        "this tool takes no keyword input at all.\n\n" +
        "Nothing is saved and the article is not retitled; apply a choice with " +
        "update_article. Requires an API key and consumes AI credits per call. Generative, " +
        "so repeated calls return different titles. Needs at least 20 characters of text to " +
        "work from.",
      inputSchema: {
        context: z
          .string()
          .min(20)
          .max(8000)
          .describe(
            "The article text to draw titles from, plain or Markdown, 20-8000 characters. " +
              "More of the real draft yields better-fitting titles than a summary.",
          ),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ context }) => {
      try {
        const data = await apiFetch<TitlesResponse>("/ai/titles", {
          method: "POST",
          body: JSON.stringify({ action: "suggest", context }),
        });

        const formatted = formatTitles(data.titles);
        return {
          content: [
            {
              type: "text",
              text: `## Title Suggestions\n\n${formatted}\n\n---\n*Titles generated from your article content.*`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${formatError(err)}` }],
          isError: true,
        };
      }
    }
  );
}

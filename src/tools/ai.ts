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
      title: "Research topic",
      description:
        "Research a topic and get AI-generated insights, sources, and a content outline. Useful before writing an article.",
      inputSchema: {
        query: z
          .string()
          .min(5)
          .max(500)
          .describe("Research topic or question. Be specific for best results."),
      },
      annotations: {
        // Nothing is saved — no draft, article, or file is created — so this
        // is read-only despite the POST. Generative, so identical calls can
        // return different text, and it publishes nothing on its own.
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
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
      title: "Generate SEO titles",
      description:
        "Generate 5 SEO/AEO/GEO-optimized article titles from a topic or keyword prompt. Targets high-volume, low-competition long-tail keywords. Optimized for Google, AI answer engines (ChatGPT, Perplexity, Claude), Google AI Overviews, and AI search experiences. Each title includes a keyword strategy hint.",
      inputSchema: {
        prompt: z
          .string()
          .min(3)
          .max(500)
          .describe(
            "Your article topic or target keywords. Be specific — include your niche, audience, and any long-tail phrases you want to rank for. Example: 'best AI writing tools for beginner bloggers 2025'"
          ),
        context: z
          .string()
          .max(8000)
          .optional()
          .describe(
            "Optional: existing article content (plain text or markdown). Providing it lets the AI align titles with your actual content."
          ),
      },
      annotations: {
        // A preview only — no article is created or retitled. Generative, so
        // repeated calls return different titles.
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
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
      title: "Suggest titles",
      description:
        "Generate 5 compelling, SEO-friendly article title options from your existing article content. Use generate_title_seo instead if you want to target specific keywords or have not written content yet.",
      inputSchema: {
        context: z
          .string()
          .min(20)
          .max(8000)
          .describe("Your article content in plain text or markdown"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
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

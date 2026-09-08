import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiFetch } from "../lib/api-client.js";
import { formatError } from "../lib/errors.js";

interface Series {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  url: string;
  article_count?: number;
}

export function registerSeriesTools(server: McpServer) {
  server.registerTool(
    "get_series",
    {
      title: "List series",
      description: "List all your series on Misar.Blog",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        const data = await apiFetch<{ series: Series[]; total: number }>("/series");
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "create_series",
    {
      title: "Create series",
      description: "Create a new series to group related articles",
      inputSchema: {
        title: z.string().min(1).describe("Series title"),
        description: z.string().optional().describe("Short description of the series"),
      },
      annotations: {
        // An organizational container, not published content — nothing it
        // groups changes visibility or status. Each call creates a NEW
        // series with no deduplication, so it is not idempotent.
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ title, description }) => {
      try {
        const series = await apiFetch<Series>("/series", {
          method: "POST",
          body: JSON.stringify({ title, description }),
        });
        return {
          content: [
            { type: "text", text: `Series created!\n\nURL: ${series.url}\nSlug: ${series.slug}\n\n${JSON.stringify(series, null, 2)}` },
          ],
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "add_to_series",
    {
      title: "Add to series",
      description: "Add an existing article to a series",
      inputSchema: {
        series_slug: z.string().describe("The series slug"),
        article_slug: z.string().describe("The article slug to add"),
        position: z.number().int().min(1).optional().describe("Position in the series (optional, appends if omitted)"),
      },
      annotations: {
        // Reorganizes where an article appears; does not change the
        // article's own publication status or URL.
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ series_slug, article_slug, position }) => {
      try {
        await apiFetch<{ ok: boolean }>(`/series/${encodeURIComponent(series_slug)}/articles`, {
          method: "POST",
          body: JSON.stringify({ article_slug, position }),
        });
        return { content: [{ type: "text", text: `Article added to series successfully.` }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );
}

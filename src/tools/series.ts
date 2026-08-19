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
      // Named `get_series` for backwards compatibility, but it LISTS. The
      // display title and the first line of the description both say so, since
      // the verb in the name would otherwise imply fetching one by id.
      title: "List my series",
      description:
        "List every series the authenticated account owns. Despite the name this returns the " +
        "whole collection, not one series — there is no single-series lookup.\n\n" +
        "Use it to find a series slug before calling add_to_series, or to check whether a " +
        "series already exists before create_series makes a duplicate.\n\n" +
        "Reads only; nothing is created or modified. Requires an API key, and takes no " +
        "parameters — it is unfiltered and unpaginated. Returns `{ series, total }` where " +
        "each entry carries id, slug, title, description, url and article_count. An empty " +
        "list means the account has no series yet, which is not an error.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
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
      title: "Create a series",
      description:
        "Create a new, empty series — a named collection that related articles can be added " +
        "to.\n\n" +
        "Creating the series does not move any article into it; follow up with add_to_series " +
        "for each one. Call get_series first to avoid making a second series with the same " +
        "title, since each call creates a NEW series and nothing deduplicates them.\n\n" +
        "Requires an API key. The series and its URL become publicly reachable, though it " +
        "shows nothing until articles are added. Returns the series with the slug that " +
        "add_to_series needs.",
      inputSchema: {
        title: z
          .string()
          .min(1)
          .describe("Display name of the series. The slug is derived from this."),
        description: z
          .string()
          .optional()
          .describe("Short summary shown on the series page. Optional."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
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
      title: "Add an article to a series",
      description:
        "Place an existing article into an existing series, optionally at a specific " +
        "position.\n\n" +
        "Both the series and the article must already exist — this creates neither. Identify " +
        "them by SLUG, not id: get_series supplies the series slug and the article tools " +
        "supply the article slug. Omit position to append at the end.\n\n" +
        "Requires an API key. Adding an article does not change its publication status or " +
        "URL; it only changes where it appears. Inserting at a position shifts the articles " +
        "after it down. Errors if either slug is unknown.",
      inputSchema: {
        series_slug: z
          .string()
          .describe("Slug of the target series, from get_series. Not its title or id."),
        article_slug: z
          .string()
          .describe("Slug of the article to add, from list_my_articles. Not its title or id."),
        position: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe(
            "1-based position within the series. Omit to append at the end. Inserting shifts " +
              "later articles down.",
          ),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ series_slug, article_slug, position }) => {
      try {
        const result = await apiFetch<{ ok: boolean }>(`/series/${encodeURIComponent(series_slug)}/articles`, {
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

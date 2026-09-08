import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiFetch } from "../lib/api-client.js";
import { formatError } from "../lib/errors.js";

interface ProfileResponse {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  profile_url: string;
  stripe_connected: boolean;
}

interface AnalyticsResponse {
  period_days: number;
  views: number;
  revenue_cents: number;
  revenue_net_cents: number;
  active_subscribers: number;
}

export function registerProfileTools(server: McpServer) {
  server.registerTool(
    "get_profile",
    {
      title: "Get profile",
      description: "Get your Misar.Blog creator profile",
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
        const profile = await apiFetch<ProfileResponse>("/me");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(profile, null, 2),
            },
          ],
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "get_analytics_summary",
    {
      title: "Analytics summary",
      description: "Get analytics summary (views, revenue, subscribers) for a time period",
      inputSchema: {
        days: z.number().int().min(1).max(365).default(30).describe("Number of days to look back (default: 30, max: 365)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ days }) => {
      try {
        const data = await apiFetch<AnalyticsResponse>(`/analytics?days=${days}`);
        const revenueUsd = (data.revenue_net_cents / 100).toFixed(2);
        const summary = {
          ...data,
          revenue_usd: `$${revenueUsd}`,
        };
        return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );
}

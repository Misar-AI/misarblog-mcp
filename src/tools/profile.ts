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

/** Register the profile and analytics tools. */
export function registerProfileTools(server: McpServer) {
  server.registerTool(
    "get_profile",
    {
      title: "Get my profile",
      description:
        "Fetch the authenticated account's own creator profile: id, username, display name, " +
        "bio, public profile URL, and whether Stripe payouts are connected.\n\n" +
        "Use it to confirm which account a key belongs to before acting on that account's " +
        "behalf, to get your own profile id for tools that take a UUID, or to check " +
        "stripe_connected before discussing paid posts. It only ever describes the caller — " +
        "there is no tool here for looking up someone else's profile.\n\n" +
        "Reads only; nothing is modified. Requires an API key, and takes no parameters. " +
        "Errors if the key is missing or invalid, which is the quickest way to test " +
        "authentication.",
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
      title: "Get analytics summary",
      description:
        "Summarise the account's performance over a trailing window: page views, gross and " +
        "net revenue, and active subscriber count.\n\n" +
        "Use it for 'how did I do this month' style questions. These are whole-account " +
        "totals — it cannot break results down per article, and it covers a trailing window " +
        "ending today rather than an arbitrary date range.\n\n" +
        "Reads only. Requires an API key. Revenue is returned in cents (revenue_cents gross, " +
        "revenue_net_cents after fees) with a formatted revenue_usd added for convenience — " +
        "read the cents fields when doing arithmetic. Zero views is a real answer, not an " +
        "error.",
      inputSchema: {
        days: z
          .number()
          .int()
          .min(1)
          .max(365)
          .default(30)
          .describe(
            "Size of the trailing window in days, ending today. 1-365, defaults to 30. " +
              "Use 7 for a week, 365 for a year.",
          ),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
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

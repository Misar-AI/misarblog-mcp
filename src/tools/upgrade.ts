import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execFileSync } from "child_process";
import { apiFetch } from "../lib/api-client.js";
import { formatError } from "../lib/errors.js";
import { renderUpgradeOffer, type UpgradeOffer } from "../lib/upgrade.js";

interface UsageRow {
  feature: string;
  feature_label: string;
  used: number;
  limit: number | null;
  remaining: number | null;
  period: "month" | "total";
  resets_at: string | null;
}

interface PlanResponse {
  plan: { slug: string; name: string };
  trial?: { eligible: boolean; active: boolean; ends_at: string | null; days: number };
  usage: UsageRow[];
  upgrade: UpgradeOffer | null;
}

interface TrialResponse {
  ok: boolean;
  plan_name?: string;
  ends_at?: string;
  message?: string;
}

function openBrowser(url: string): void {
  try {
    if (process.platform === "darwin") execFileSync("open", [url], { stdio: "ignore" });
    else if (process.platform === "win32")
      execFileSync("cmd.exe", ["/c", "start", "", url], { stdio: "ignore" });
    else execFileSync("xdg-open", [url], { stdio: "ignore" });
  } catch {
    // Headless/SSH — the URL is printed in the card either way.
  }
}

/** ██████░░░░░░  50% */
function bar(used: number, limit: number): string {
  const cells = 16;
  const ratio = limit <= 0 ? 1 : Math.min(1, used / limit);
  const filled = Math.round(ratio * cells);
  return `${"█".repeat(filled)}${"░".repeat(cells - filled)} ${String(
    Math.round(ratio * 100),
  ).padStart(3)}%`;
}

function renderUsage(data: PlanResponse): string {
  const out: string[] = [];
  out.push("");
  out.push(`  Misar.Blog — ${data.plan.name} plan`);
  out.push(`  ${"─".repeat(58)}`);
  out.push("");

  const width = Math.max(...data.usage.map((u) => u.feature_label.length));
  for (const row of data.usage) {
    if (row.limit === null) {
      out.push(`  ${row.feature_label.padEnd(width)}   ${"─".repeat(16)}  Unlimited`);
      continue;
    }
    const scope = row.period === "month" ? "this month" : "total";
    out.push(
      `  ${row.feature_label.padEnd(width)}   ${bar(row.used, row.limit)}   ` +
        `${row.used.toLocaleString("en-US")} / ${row.limit.toLocaleString("en-US")} ${scope}`,
    );
  }
  out.push("");
  return out.join("\n");
}

export function registerUpgradeTool(server: McpServer) {
  server.tool(
    "upgrade",
    "Show your current Misar.Blog plan, how much of each quota you have left, and what upgrading unlocks. Call it any time — not only after hitting a limit. Set open=true to open the checkout page in your browser.",
    {
      open: z
        .boolean()
        .optional()
        .describe("Open the upgrade/checkout page in the default browser."),
      plan: z
        .string()
        .optional()
        .describe("Plan slug to open (e.g. 'pro', 'business'). Defaults to the recommended plan."),
      start_trial: z
        .boolean()
        .optional()
        .describe("Start the free no-card trial immediately, if you're eligible."),
    },
    async ({ open, plan, start_trial }) => {
      try {
        // Starting the trial first means the plan snapshot below already
        // reflects the new allowance, so the user sees their unblocked state
        // in the same response instead of having to re-run the tool.
        if (start_trial) {
          const trial: TrialResponse = await apiFetch<TrialResponse>("/trial", {
            method: "POST",
            body: JSON.stringify({ feature: "mcp_write_actions" }),
          }).catch((err: unknown) => ({
            ok: false,
            message: err instanceof Error ? err.message : "Could not start the trial.",
          }));

          if (!trial.ok) {
            return {
              content: [
                {
                  type: "text" as const,
                  text:
                    `Could not start a trial: ${trial.message ?? "unknown error"}\n\n` +
                    `Run \`upgrade\` to see your paid options.`,
                },
              ],
              isError: true,
            };
          }

          const data = await apiFetch<PlanResponse>("/plan");
          return {
            content: [
              {
                type: "text" as const,
                text:
                  `✅ ${trial.message ?? "Your trial is active."}\n` +
                  `   Ends ${trial.ends_at ? new Date(trial.ends_at).toDateString() : "soon"}.\n` +
                  renderUsage(data),
              },
            ],
          };
        }

        const data = await apiFetch<PlanResponse>("/plan");

        const sections: string[] = [renderUsage(data)];

        if (data.upgrade) {
          sections.push(renderUpgradeOffer(data.upgrade));
        } else {
          sections.push(
            `  You're on the top plan — every quota above is at its maximum.\n` +
              `  Need more? Talk to us about Enterprise: https://www.misar.blog/contact\n`,
          );
        }

        if (open) {
          const chosen = plan
            ? data.upgrade?.plans.find((p) => p.slug === plan)
            : data.upgrade?.plans.find((p) => p.recommended);
          const url = chosen?.url ?? data.upgrade?.urls.compare;
          if (url) {
            openBrowser(url);
            sections.push(`  Opened ${url} in your browser.\n`);
          }
        }

        return { content: [{ type: "text" as const, text: sections.join("\n") }] };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: formatError(err) }],
          isError: true,
        };
      }
    },
  );
}

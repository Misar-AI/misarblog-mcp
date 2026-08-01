import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { tryGetApiKey } from "../lib/auth.js";
import { apiFetch } from "../lib/api-client.js";
import { formatError } from "../lib/errors.js";

interface ProfileResponse {
  username: string;
}

export function registerStatusTool(server: McpServer) {
  server.tool(
    "status",
    "Check whether you are authenticated with Misar.Blog and which account is connected. Run this first to verify your connection.",
    {},
    async () => {
      const key = tryGetApiKey();
      if (!key) {
        return {
          content: [{
            type: "text" as const,
            text: "Not authenticated. Run the `login` tool to connect your Misar.Blog account.",
          }],
        };
      }
      try {
        const profile = await apiFetch<ProfileResponse>("/me");
        return {
          content: [{
            type: "text" as const,
            text: `Authenticated as @${profile.username}. Your API key is active and working.`,
          }],
        };
      } catch (err) {
        return {
          content: [{
            type: "text" as const,
            text: `API key found but rejected by server: ${formatError(err)}. Run \`login\` to re-authenticate.`,
          }],
          isError: true,
        };
      }
    }
  );
}

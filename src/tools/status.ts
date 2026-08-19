import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { tryGetApiKey } from "../lib/auth.js";
import { apiFetch } from "../lib/api-client.js";
import { formatError } from "../lib/errors.js";

interface ProfileResponse {
  username: string;
}

export function registerStatusTool(server: McpServer) {
  server.registerTool(
    "status",
    {
      title: "Check authentication status",
      description:
        "Report whether this client holds a working Misar.Blog API key, and which account it " +
        "belongs to.\n\n" +
        "Run it first when anything is failing with an auth error, and before a run of write " +
        "operations, so you find out up front rather than midway. It distinguishes three " +
        "states: no key stored, a key that is stored but rejected, and a valid key with its " +
        "username. If it reports no key, run `login`.\n\n" +
        "Reads only; it never creates or rotates a key — `login` does that. Takes no " +
        "parameters. Unlike most tools here it does not fail when unauthenticated: 'not " +
        "authenticated' is a normal successful answer, not an error. For plan and quota, use " +
        "`upgrade`; for the full profile, get_profile.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
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

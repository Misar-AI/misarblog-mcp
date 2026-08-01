import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildServer } from "./server.js";
import { httpContext, runWithContext } from "./lib/context.js";

/**
 * Streamable HTTP transport for the Misar.Blog MCP server.
 *
 * Builds the SAME server as the stdio binary — see `buildServer` — so the
 * hosted endpoint and the npm package can never drift apart. Auth is injected
 * by the host, because it depends on the MisarBlog database.
 *
 * Every request runs inside `runWithContext`, which is what makes one shared
 * tool implementation safe in a multi-tenant process: the credential lives in
 * AsyncLocalStorage for the duration of the call rather than in module state.
 */

export interface BlogCaller {
  userId: string;
  /** The raw API key to forward to the REST API on this caller's behalf. */
  apiKey: string;
}

export interface BlogHttpOptions {
  /** Resolve an Authorization header to a caller, or null when invalid. */
  authenticate: (authHeader: string | null) => Promise<BlogCaller | null>;
  /**
   * Optional per-caller rate limit, applied after authentication so the budget
   * is keyed to the API key rather than a shared client IP. Return false to
   * reject with 429.
   */
  rateLimit?: (caller: BlogCaller) => Promise<boolean>;
  /** API base the tools call, e.g. `https://www.misar.blog/api/v1`. */
  baseUrl: string;
  onError?: (error: unknown) => void;
}

interface Session {
  transport: WebStandardStreamableHTTPServerTransport;
  server: McpServer;
}

/**
 * Live sessions, keyed by mcp-session-id.
 *
 * Module-level and therefore per-process. This holds only transport state — no
 * credentials — because each request supplies its own key through the ambient
 * context. Storing a key here would leak it to the next caller reusing the id.
 */
const sessions = new Map<string, Session>();

const MAX_SESSIONS = 500;

function rpcError(code: number, message: string, status = 200): Response {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code, message } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function createBlogHttpHandler(options: BlogHttpOptions) {
  const { authenticate, rateLimit, baseUrl, onError } = options;

  async function getOrCreateSession(sessionId: string | null): Promise<Session> {
    if (sessionId) {
      const existing = sessions.get(sessionId);
      if (existing) return existing;
    }

    // Cheap bound so a client that never reuses a session id cannot grow the
    // map without limit; sessions carry no credentials, so eviction is safe.
    if (sessions.size >= MAX_SESSIONS) {
      const oldest = sessions.keys().next().value;
      if (oldest) sessions.delete(oldest);
    }

    const server = buildServer({ includeLocalTools: false });
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      onsessioninitialized: (id: string) => {
        sessions.set(id, { transport, server });
      },
    });
    transport.onclose = () => {
      if (transport.sessionId) sessions.delete(transport.sessionId);
    };

    await server.connect(transport);
    return { transport, server };
  }

  return async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const queryKey = url.searchParams.get("apiKey");
    const authHeader = queryKey ? `Bearer ${queryKey}` : request.headers.get("authorization");

    const caller = await authenticate(authHeader);
    if (!caller) {
      // RFC 9728 challenge so OAuth-capable clients can discover how to auth.
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32001,
            message:
              "Unauthorized: provide Authorization: Bearer mbk_<key>. Create one at https://www.misar.blog/dashboard/settings/api-keys",
          },
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "WWW-Authenticate": 'Bearer realm="Misar.Blog"',
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Expose-Headers": "WWW-Authenticate",
          },
        },
      );
    }

    if (rateLimit && !(await rateLimit(caller))) {
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32029, message: "Rate limit exceeded. Try again shortly." },
        }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
    }

    try {
      const session = await getOrCreateSession(request.headers.get("mcp-session-id"));
      return await runWithContext(httpContext(caller.apiKey, baseUrl), () =>
        session.transport.handleRequest(request),
      );
    } catch (err) {
      onError?.(err);
      return rpcError(-32603, "Internal error handling MCP request");
    }
  };
}

export function corsPreflight(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id",
      "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
    },
  });
}

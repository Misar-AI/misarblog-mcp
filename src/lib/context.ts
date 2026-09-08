import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Per-call credentials for a Misar.Blog MCP tool.
 *
 * The stdio server resolves these once from the environment or
 * ~/.misarblog/config.json. The HTTP endpoint cannot: one Next.js process
 * serves many users, so a module-level credential would leak across requests.
 */
export interface BlogContext {
  apiKey: string;
  /** Versioned API base, e.g. `https://api.misar.io/blog/v1`. */
  baseUrl: string;
  source: "mcp_stdio" | "mcp_http";
}

/**
 * Request-scoped credential storage.
 *
 * AsyncLocalStorage rather than threading a context parameter through every
 * tool: the 23 tool modules were written against a zero-argument `apiFetch`,
 * and rewriting all of them would risk changing behaviour while the real goal
 * is only to make the SAME code safe to run per-request. `apiFetch` prefers the
 * ambient store and falls back to the on-disk config, so stdio is unchanged.
 */
const storage = new AsyncLocalStorage<BlogContext>();

/** Run `fn` with `ctx` visible to every apiFetch beneath it. */
export function runWithContext<T>(ctx: BlogContext, fn: () => Promise<T>): Promise<T> {
  return storage.run(ctx, fn);
}

/** The ambient context, or null on stdio where credentials come from disk. */
export function currentContext(): BlogContext | null {
  return storage.getStore() ?? null;
}

export function httpContext(apiKey: string, baseUrl: string): BlogContext {
  return { apiKey, baseUrl: baseUrl.replace(/\/$/, ""), source: "mcp_http" };
}

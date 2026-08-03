/**
 * The authentication contract every Misar MCP server must satisfy.
 *
 * Three rules, and all three have been violated in production before:
 *
 *  1. Discovery NEVER requires credentials. The old server called
 *     process.exit(1) on a missing key, so registry scanners saw a dead
 *     process instead of the catalogue — which is why the Smithery listing sat
 *     frozen at a stale 16-tool snapshot for months.
 *  2. Execution ALWAYS requires credentials. tools/call must refuse without a
 *     valid key, with the RFC 9728 challenge attached.
 *  3. The refusal must be ACTIONABLE. An MCP client relays this text straight
 *     to the model and on to the user, so it is the whole authentication UX.
 *     "Not configured" (the blog server's old message) is a dead end.
 *
 * Keep this file in sync with the same suite in mail-mcp-server, and copy it
 * into every new product server — see docs/Guidelines/MCP_SERVER_PROTOCOL.md.
 */
import { describe, it, expect } from "vitest";
import { createBlogHttpHandler } from "../../src/http.js";
import { describeServer } from "../../src/server.js";
import { authGuidance, AUTH_URLS, ENV_KEY, KEY_PREFIX, CONFIG_PATH } from "../../src/lib/auth-guidance.js";

const VALID = "Bearer mbk_good";

const handler = createBlogHttpHandler({
  baseUrl: "https://example.invalid/api/v1",
  authenticate: async (h) => (h === VALID ? { userId: "u1", apiKey: "mbk_good" } : null),
});

function post(body: unknown, headers: Record<string, string> = {}) {
  return handler(
    new Request("https://www.misar.blog/api/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...headers },
      body: JSON.stringify(body),
    }),
  );
}

const INIT = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } },
};

describe("rule 1 — discovery never requires credentials", () => {
  // The blog transport is session-based and authenticates the whole request,
  // so its unauthenticated discovery surface is the public GET summary
  // (see the route) plus stdio. What must hold here is that the catalogue a
  // scanner can reach is the REAL one, never a truncated snapshot.
  it("publishes the full catalogue without credentials", () => {
    const described = describeServer({ includeLocalTools: false });
    expect(described.tools.length).toBeGreaterThan(20);
    for (const tool of described.tools) expect(tool.description.length).toBeGreaterThan(10);
  });

  it("never exposes local-only tools to remote callers", () => {
    const names = describeServer({ includeLocalTools: false }).tools.map((t) => t.name);
    for (const local of ["login", "status", "upload_image"]) expect(names).not.toContain(local);
  });
});

describe("rule 2 — execution always requires credentials", () => {
  it("refuses every request without a key", async () => {
    const res = await post(INIT);
    expect(res.status).toBe(401);
  });

  it("attaches the RFC 9728 challenge so OAuth clients can recover", async () => {
    const res = await post(INIT);
    expect(res.headers.get("WWW-Authenticate")).toContain("Bearer");
  });

  it("accepts a request with a valid key", async () => {
    const res = await post(INIT, { authorization: VALID });
    expect(res.status).toBe(200);
  });

});

describe("rule 3 — the refusal is actionable", () => {
  it("tells the user every way to authenticate", async () => {
    const res = await post(INIT);
    const message = (await res.json()).error.message as string;

    // Browser path.
    expect(message).toContain(AUTH_URLS.authorize);
    expect(message).toContain("login");
    // Manual path — a real dashboard URL, not "generate a key somewhere".
    expect(message).toContain(AUTH_URLS.apiKeys);
    expect(message).toContain(KEY_PREFIX);
    // Where the key actually goes, for local AND cloud setups.
    expect(message).toContain(ENV_KEY);
    expect(message).toContain(CONFIG_PATH);
    expect(message).toContain("env");
    // Somewhere to read more.
    expect(message).toContain(AUTH_URLS.docs);
  });

  it("distinguishes a missing key from a rejected one", () => {
    // Telling someone whose key was revoked to create their first key wastes
    // their time and hides the real problem.
    expect(authGuidance("missing")).toContain("Not authenticated");
    expect(authGuidance("rejected")).toContain("rejected");
    expect(authGuidance("rejected")).toContain(AUTH_URLS.apiKeys);
  });

  it("never leaks a credential into the guidance", () => {
    for (const reason of ["missing", "rejected"] as const) {
      const text = authGuidance(reason);
      // Placeholders only — a real key must never be echoed back.
      expect(text).not.toMatch(/mbk_[A-Za-z0-9]{12,}/);
    }
  });
});

// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createServer } from "http";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// ── Mock fs / os (no real disk writes) ────────────────────────────────────────
vi.mock("fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));
vi.mock("os", () => ({ homedir: vi.fn(() => "/test-home") }));

// ── Mock child_process (prevent browser opening) ──────────────────────────────
vi.mock("child_process", () => ({ execFileSync: vi.fn() }));
import { execFileSync } from "child_process";

// ── Mock apiFetch to control "already authenticated" check ────────────────────
const mockApiFetch = vi.fn();
vi.mock("../../src/lib/api-client.js", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

// ── Mock saveConfig ────────────────────────────────────────────────────────────
const mockSaveConfig = vi.fn();
vi.mock("../../src/lib/auth.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../src/lib/auth.js")>();
  return {
    ...real,
    saveConfig: (...args: unknown[]) => mockSaveConfig(...args),
    // tryGetApiKey and getBaseUrl use the real implementations (but readFileSync is mocked)
  };
});

import { readFileSync } from "fs";
import { registerLoginTool } from "../../src/tools/login.js";

const mockReadFileSync = vi.mocked(readFileSync);

/** Creates a minimal MCP server mock that captures registered tools */
function makeMockServer() {
  const handlers: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
  return {
    server: {
      tool: vi.fn((name: string, _desc: string, _schema: unknown, handler: (...args: unknown[]) => Promise<unknown>) => {
        handlers[name] = handler;
      }),
    } as unknown as McpServer,
    call: (name: string, args: Record<string, unknown> = {}) => {
      const h = handlers[name];
      if (!h) throw new Error(`Tool "${name}" not registered`);
      return h(args);
    },
  };
}

/** Sends a POST request to a local callback port to simulate browser authorization */
async function sendCallback(port: number, payload: Record<string, unknown>): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const body = JSON.stringify(payload);
    const options = {
      hostname: "127.0.0.1",
      port,
      path: "/token",
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    };
    const req = require("http").request(options, (res: { on: (e: string, cb: () => void) => void }) => {
      res.on("data", () => undefined);
      res.on("end", resolve);
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

/** Find a free port in the 9001–9099 range (must stay within pickPort's accepted range) */
function findFreePort(): Promise<number> {
  const candidates = Array.from({ length: 99 }, (_, i) => 9001 + i);
  return new Promise((resolve, reject) => {
    function tryNext(i: number) {
      if (i >= candidates.length) { reject(new Error("No free port in 9001-9099")); return; }
      const srv = createServer();
      srv.listen(candidates[i]!, "127.0.0.1", () => {
        const port = candidates[i]!;
        srv.close(() => resolve(port));
      });
      srv.on("error", () => tryNext(i + 1));
    }
    tryNext(0);
  });
}

describe("login tool — already authenticated guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // No existing config key by default
    mockReadFileSync.mockImplementation(() => { throw new Error("ENOENT"); });
  });

  it("returns 'Already authenticated' when key is valid and force is not set", async () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({ api_key: "mbk_existing" }) as unknown as Buffer);
    mockApiFetch.mockResolvedValue({ username: "alice" });

    const { server, call } = makeMockServer();
    registerLoginTool(server);

    type LoginResult = { content: Array<{ type: string; text: string }> };
    const result = await call("login", {}) as LoginResult;

    expect(result.content[0]!.text).toContain("Already authenticated");
    expect(result.content[0]!.text).toContain("@alice");
    expect(result.content[0]!.text).toContain("force=true");
  });

  it("falls through to re-auth when existing key is rejected by server (401)", async () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({ api_key: "mbk_stalekey" }) as unknown as Buffer);
    // Server rejects the stale key
    mockApiFetch.mockRejectedValue(new Error("Invalid or missing API key"));

    const { server, call } = makeMockServer();
    registerLoginTool(server);

    // Use a port we know (specify it directly to avoid random selection)
    // The tool will try to listen; we simulate a 120s timeout by not sending callback
    // We test that it does NOT return "Already authenticated"
    const resultPromise = call("login", { port: 9091 }) as Promise<{ content: Array<{ type: string; text: string }> }>;

    // Let the event loop run briefly then check we haven't resolved with "Already authenticated"
    const raceResult = await Promise.race([
      resultPromise.then(r => ({ settled: true as const, r })),
      new Promise<{ settled: false }>(res => setTimeout(() => res({ settled: false }), 100)),
    ]);

    // Should still be pending (waiting for callback) — not resolved with "already authenticated"
    if (raceResult.settled) {
      expect(raceResult.r.content[0]!.text).not.toContain("Already authenticated");
    }
    // Clean up — close server by timing out (we don't actually wait 120s in tests)
  }, 5000);

  it("proceeds directly to login flow when force=true even if key is valid", async () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({ api_key: "mbk_existing" }) as unknown as Buffer);
    mockApiFetch.mockResolvedValue({ username: "alice" });

    const { server, call } = makeMockServer();
    registerLoginTool(server);

    // With force=true, apiFetch should NOT be called for the guard check
    // The login flow starts immediately (will wait for callback / timeout)
    const resultPromise = call("login", { force: true, port: 9092 }) as Promise<{ content: Array<{ type: string; text: string }> }>;

    const raceResult = await Promise.race([
      resultPromise.then(r => ({ settled: true as const, r })),
      new Promise<{ settled: false }>(res => setTimeout(() => res({ settled: false }), 100)),
    ]);

    // Should be pending (waiting for callback), NOT immediately returning "already authenticated"
    if (raceResult.settled) {
      // If it settled quickly, it should be a timeout message, not "already authenticated"
      expect(raceResult.r.content[0]!.text).not.toContain("Already authenticated");
    }
    // apiFetch called 0 times (guard bypassed)
    expect(mockApiFetch).not.toHaveBeenCalled();
  }, 5000);
});

describe("login tool — successful first-time auth flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadFileSync.mockImplementation(() => { throw new Error("ENOENT"); });
    mockApiFetch.mockRejectedValue(new Error("Not configured"));
  });

  it("resolves with success message when callback received with valid mbk_ key", async () => {
    const port = await findFreePort();
    // Constrain to valid port range by using a raw port argument
    // (we pass the port directly so the tool listens on it)
    const { server, call } = makeMockServer();
    registerLoginTool(server);

    const resultPromise = call("login", { port }) as Promise<{ content: Array<{ type: string; text: string }> }>;

    // Wait a tick for the HTTP server to start, then send the callback
    await new Promise(r => setTimeout(r, 50));
    await sendCallback(port, { api_key: "mbk_newkey123456789abcdefghijklmn", username: "bob" });

    const result = await resultPromise;
    expect(result.content[0]!.text).toContain("Connected as @bob");
    expect(result.content[0]!.text).toContain("~/.misarblog/config.json");
    expect(mockSaveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ api_key: "mbk_newkey123456789abcdefghijklmn", username: "bob" })
    );
  }, 10000);

  it("rejects callback with non-mbk_ key (400) and keeps waiting", async () => {
    const port = await findFreePort();
    const { server, call } = makeMockServer();
    registerLoginTool(server);

    const resultPromise = call("login", { port }) as Promise<{ content: Array<{ type: string; text: string }> }>;

    await new Promise(r => setTimeout(r, 50));

    // Send invalid key first — server should 400 and keep listening
    await sendCallback(port, { api_key: "sk_wrongprefix" });
    // Verify not yet resolved
    const pending = await Promise.race([
      resultPromise.then(() => "settled"),
      new Promise(r => setTimeout(() => r("pending"), 100)),
    ]);
    expect(pending).toBe("pending");
    expect(mockSaveConfig).not.toHaveBeenCalled();

    // Now send valid key
    await sendCallback(port, { api_key: "mbk_validafter", username: "carol" });
    const result = await resultPromise;
    expect(result.content[0]!.text).toContain("Connected as @carol");
  }, 10000);
});

describe("login tool — timeout scenario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadFileSync.mockImplementation(() => { throw new Error("ENOENT"); });
    mockApiFetch.mockRejectedValue(new Error("Not configured"));
  });

  it("resolves with timeout message and manual URL after 120s (mocked with fake timers)", async () => {
    const port = await findFreePort();
    const { server, call } = makeMockServer();
    registerLoginTool(server);

    // Fake timers must be installed BEFORE the login flow starts: a timer
    // created under real timers is invisible to advanceTimersByTime, which is
    // why advancing after the fact left the promise pending forever.
    vi.useFakeTimers();
    const resultPromise = call("login", { port }) as Promise<{ content: Array<{ type: string; text: string }> }>;

    // The 120s timeout is registered inside a .then() on the listen promise, so
    // the microtask queue has to drain before the timer exists. The async
    // variant interleaves microtask flushes with each clock step; the plain
    // advanceTimersByTime does not, and fires against an empty timer queue.
    await vi.advanceTimersByTimeAsync(120_000);
    vi.useRealTimers();

    const result = await resultPromise;
    const text = result.content[0]!.text;
    expect(text).toContain("timed out");
    // The fallback URL must point at the WEB app's consent screen. Pointing it
    // at the API host (api.misar.io/blog/v1/authorize) 404s, which is what the
    // default install used to do.
    expect(text).toContain("https://www.misar.blog/authorize");
    expect(text).not.toContain("api.misar.io");
    expect(text).toContain("mode=key");
  }, 10000);
});

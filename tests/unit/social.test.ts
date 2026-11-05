/**
 * Social tools (upvotes, saved, reputation, reposts) against the v1 API.
 *
 * Each tool is called through a real MCP client over an in-memory transport,
 * with `fetch` stubbed, so these tests pin the exact request every tool sends:
 * method, path, query and body. Those shapes mirror the MisarBlog route
 * handlers; a drift here means the tool silently hits the wrong endpoint.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildServer, describeServer } from "../../src/server.js";

const BASE = "https://blog.example.invalid";
const ARTICLE = "3f2b6c1e-8a4d-4b7e-9c2a-1d5e6f7a8b9c";

type Captured = { url: URL; method: string; body: unknown; auth: string | null };

let client: Client;
let calls: Captured[];
let reply: { status: number; body: unknown };

const savedEnv = { key: process.env.MISARBLOG_API_KEY, base: process.env.MISARBLOG_BASE_URL };

beforeAll(async () => {
  process.env.MISARBLOG_API_KEY = "mbk_test";
  process.env.MISARBLOG_BASE_URL = BASE;
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  await buildServer({ includeLocalTools: false }).connect(serverT);
  client = new Client({ name: "social-test", version: "1" });
  await client.connect(clientT);
});

afterAll(async () => {
  await client.close();
  if (savedEnv.key === undefined) delete process.env.MISARBLOG_API_KEY;
  else process.env.MISARBLOG_API_KEY = savedEnv.key;
  if (savedEnv.base === undefined) delete process.env.MISARBLOG_BASE_URL;
  else process.env.MISARBLOG_BASE_URL = savedEnv.base;
});

beforeEach(() => {
  calls = [];
  reply = { status: 200, body: { ok: true } };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      calls.push({
        url: new URL(String(input)),
        method: init.method ?? "GET",
        body: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
        auth: headers.get("authorization"),
      });
      return new Response(JSON.stringify(reply.body), {
        status: reply.status,
        headers: { "content-type": "application/json" },
      });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function call(name: string, args: Record<string, unknown>) {
  const result = (await client.callTool({ name, arguments: args })) as {
    content: { type: string; text: string }[];
    isError?: boolean;
  };
  return { result, text: result.content[0]?.text ?? "" };
}

function only(): Captured {
  expect(calls).toHaveLength(1);
  return calls[0]!;
}

const NEW_TOOLS = [
  "upvote_article",
  "remove_upvote",
  "save_article",
  "unsave_article",
  "list_saved",
  "get_reputation",
  "repost_article",
  "remove_repost",
];

describe("catalogue", () => {
  it("registers every social tool on both transports", () => {
    for (const opts of [{ includeLocalTools: true }, { includeLocalTools: false }]) {
      const names = describeServer(opts).tools.map((t) => t.name);
      for (const name of NEW_TOOLS) expect(names, `${name} missing`).toContain(name);
    }
  });

  it("never describes the new tools with the retired reaction wording", () => {
    const tools = describeServer().tools.filter((t) => NEW_TOOLS.includes(t.name));
    for (const tool of tools) {
      expect(tool.description, tool.name).not.toMatch(/\b(like|likes|liked|bookmark\w*)\b/i);
    }
  });

  it("keeps the reaction tools, marked deprecated with the sunset date", () => {
    const tools = describeServer().tools;
    for (const name of ["get_reactions", "add_reaction", "remove_reaction"]) {
      const tool = tools.find((t) => t.name === name);
      expect(tool, `${name} was dropped`).toBeDefined();
      expect(tool!.description).toMatch(/^Deprecated/);
      expect(tool!.description).toContain("2027-02-03");
    }
  });

  it("points add_reaction callers at the replacement tools", () => {
    const add = describeServer().tools.find((t) => t.name === "add_reaction")!;
    expect(add.description).toContain("upvote_article");
    expect(add.description).toContain("save_article");
  });
});

describe("upvotes", () => {
  it("upvote_article POSTs the article id to /upvotes with the API key", async () => {
    reply.body = { upvoted: true, upvote_count: 3 };
    const { result, text } = await call("upvote_article", { article_id: ARTICLE });
    const c = only();
    expect(c.method).toBe("POST");
    expect(c.url.pathname).toBe("/api/v1/upvotes");
    expect(c.body).toEqual({ article_id: ARTICLE });
    expect(c.auth).toBe("Bearer mbk_test");
    expect(result.isError).toBeFalsy();
    expect(JSON.parse(text)).toEqual({ upvoted: true, upvote_count: 3 });
  });

  it("remove_upvote DELETEs with the article id in the query", async () => {
    await call("remove_upvote", { article_id: ARTICLE });
    const c = only();
    expect(c.method).toBe("DELETE");
    expect(c.url.pathname).toBe("/api/v1/upvotes");
    expect(c.url.searchParams.get("article_id")).toBe(ARTICLE);
    expect(c.body).toBeUndefined();
  });

  it("rejects a non-UUID article id without calling the API", async () => {
    const { result } = await call("upvote_article", { article_id: "not-a-uuid" });
    expect(result.isError).toBe(true);
    expect(calls).toHaveLength(0);
  });
});

describe("saved", () => {
  it("save_article POSTs to /saved", async () => {
    await call("save_article", { article_id: ARTICLE });
    const c = only();
    expect(c.method).toBe("POST");
    expect(c.url.pathname).toBe("/api/v1/saved");
    expect(c.body).toEqual({ article_id: ARTICLE });
  });

  it("unsave_article DELETEs with the article id in the query", async () => {
    await call("unsave_article", { article_id: ARTICLE });
    const c = only();
    expect(c.method).toBe("DELETE");
    expect(c.url.pathname).toBe("/api/v1/saved");
    expect(c.url.searchParams.get("article_id")).toBe(ARTICLE);
  });

  it("list_saved GETs with the default page size and no cursor", async () => {
    reply.body = { items: [], next_cursor: null };
    const { text } = await call("list_saved", {});
    const c = only();
    expect(c.method).toBe("GET");
    expect(c.url.pathname).toBe("/api/v1/saved");
    expect(c.url.searchParams.get("limit")).toBe("20");
    expect(c.url.searchParams.has("cursor")).toBe(false);
    expect(JSON.parse(text)).toEqual({ items: [], next_cursor: null });
  });

  it("list_saved forwards the cursor and limit", async () => {
    await call("list_saved", { cursor: "abc_DEF-1", limit: 50 });
    const c = only();
    expect(c.url.searchParams.get("cursor")).toBe("abc_DEF-1");
    expect(c.url.searchParams.get("limit")).toBe("50");
  });

  it("list_saved refuses a page size above the server's cap", async () => {
    const { result } = await call("list_saved", { limit: 51 });
    expect(result.isError).toBe(true);
    expect(calls).toHaveLength(0);
  });
});

describe("reputation", () => {
  it("get_reputation GETs /reputation/<username>", async () => {
    reply.body = { username: "jane", reputation: 120, rep_tier: 2 };
    const { text } = await call("get_reputation", { username: "jane" });
    const c = only();
    expect(c.method).toBe("GET");
    expect(c.url.pathname).toBe("/api/v1/reputation/jane");
    expect(JSON.parse(text).rep_tier).toBe(2);
  });

  it("strips a leading @ from the username", async () => {
    await call("get_reputation", { username: "@jane.doe" });
    expect(only().url.pathname).toBe("/api/v1/reputation/jane.doe");
  });

  it("rejects a username that could escape the path", async () => {
    const { result } = await call("get_reputation", { username: "../articles" });
    expect(result.isError).toBe(true);
    expect(calls).toHaveLength(0);
  });
});

describe("reposts", () => {
  it("repost_article POSTs the article id and the note", async () => {
    reply.body = { reposted: true, repost_count: 1 };
    await call("repost_article", { article_id: ARTICLE, note: "Worth a read" });
    const c = only();
    expect(c.method).toBe("POST");
    expect(c.url.pathname).toBe("/api/v1/reposts");
    expect(c.body).toEqual({ article_id: ARTICLE, note: "Worth a read" });
  });

  it("omits the note when none is given", async () => {
    await call("repost_article", { article_id: ARTICLE });
    expect(only().body).toEqual({ article_id: ARTICLE });
  });

  it("accepts a note of exactly 280 characters and refuses 281", async () => {
    await call("repost_article", { article_id: ARTICLE, note: "x".repeat(280) });
    expect(calls).toHaveLength(1);

    calls = [];
    const { result } = await call("repost_article", { article_id: ARTICLE, note: "x".repeat(281) });
    expect(result.isError).toBe(true);
    expect(calls).toHaveLength(0);
  });

  it("remove_repost DELETEs with the article id in the JSON body", async () => {
    // The v1 route reads the body, unlike /upvotes and /saved.
    await call("remove_repost", { article_id: ARTICLE });
    const c = only();
    expect(c.method).toBe("DELETE");
    expect(c.url.pathname).toBe("/api/v1/reposts");
    expect(c.url.search).toBe("");
    expect(c.body).toEqual({ article_id: ARTICLE });
  });

  it("surfaces an API refusal as a tool error", async () => {
    reply = { status: 403, body: { error: "This needs the Reader reputation tier.", code: "tier_required" } };
    const { result, text } = await call("repost_article", { article_id: ARTICLE });
    expect(result.isError).toBe(true);
    expect(text).toContain("Reader");
  });
});

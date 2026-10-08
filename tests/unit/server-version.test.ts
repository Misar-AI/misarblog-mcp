import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SERVER_VERSION } from "../../src/server.js";

describe("SERVER_VERSION", () => {
  it("matches package.json, so initialize reports the published version", () => {
    const pkgPath = resolve(process.cwd(), "packages/blog-mcp-server/package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string };
    expect(SERVER_VERSION).toBe(pkg.version);
  });
});

// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fs before importing auth module so CONFIG_PATH usage is intercepted
vi.mock("fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock("os", () => ({
  homedir: vi.fn(() => "/test-home"),
}));

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { getApiKey, tryGetApiKey, saveConfig, getBaseUrl } from "../../src/lib/auth.js";

const mockReadFileSync = vi.mocked(readFileSync);
const mockWriteFileSync = vi.mocked(writeFileSync);
const mockMkdirSync = vi.mocked(mkdirSync);

const CONFIG_PATH = "/test-home/.misarblog/config.json";

describe("getApiKey()", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.MISARBLOG_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("throws with helpful message when no env var and no config file", () => {
    mockReadFileSync.mockImplementation(() => { throw new Error("ENOENT"); });
    expect(() => getApiKey()).toThrow("Not configured");
  });

  it("returns MISARBLOG_API_KEY env var when set", () => {
    process.env.MISARBLOG_API_KEY = "mbk_envkey123";
    const result = getApiKey();
    expect(result).toBe("mbk_envkey123");
    expect(mockReadFileSync).not.toHaveBeenCalled();
  });

  it("trims whitespace from env var", () => {
    process.env.MISARBLOG_API_KEY = "  mbk_trimmed  ";
    expect(getApiKey()).toBe("mbk_trimmed");
  });

  it("returns api_key from config file when env var not set", () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({ api_key: "mbk_fromfile" }) as unknown as Buffer);
    expect(getApiKey()).toBe("mbk_fromfile");
  });

  it("env var takes precedence over config file", () => {
    process.env.MISARBLOG_API_KEY = "mbk_fromenv";
    mockReadFileSync.mockReturnValue(JSON.stringify({ api_key: "mbk_fromfile" }) as unknown as Buffer);
    expect(getApiKey()).toBe("mbk_fromenv");
  });

  it("throws when config file exists but api_key field is missing", () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({ username: "nokey" }) as unknown as Buffer);
    expect(() => getApiKey()).toThrow("Not configured");
  });
});

describe("tryGetApiKey()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.MISARBLOG_API_KEY;
  });

  it("returns null when not configured — never throws", () => {
    mockReadFileSync.mockImplementation(() => { throw new Error("ENOENT"); });
    expect(tryGetApiKey()).toBeNull();
  });

  it("returns the key when configured via env", () => {
    process.env.MISARBLOG_API_KEY = "mbk_trytest";
    expect(tryGetApiKey()).toBe("mbk_trytest");
  });

  it("returns the key when configured via config file", () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({ api_key: "mbk_configkey" }) as unknown as Buffer);
    expect(tryGetApiKey()).toBe("mbk_configkey");
  });
});

describe("saveConfig()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no existing config
    mockReadFileSync.mockImplementation(() => { throw new Error("ENOENT"); });
  });

  it("creates the ~/.misarblog directory if missing", () => {
    saveConfig({ api_key: "mbk_newkey" });
    expect(mockMkdirSync).toHaveBeenCalledWith(
      "/test-home/.misarblog",
      { recursive: true }
    );
  });

  it("writes the config to CONFIG_PATH as formatted JSON", () => {
    saveConfig({ api_key: "mbk_written", username: "alice" });
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      CONFIG_PATH,
      expect.stringContaining('"api_key"'),
      "utf8"
    );
    const written = JSON.parse((mockWriteFileSync.mock.calls[0]![1] as string));
    expect(written.api_key).toBe("mbk_written");
    expect(written.username).toBe("alice");
  });

  it("merges with existing config rather than overwriting", () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({ username: "existing_user", base_url: "https://example.com" }) as unknown as Buffer);
    saveConfig({ api_key: "mbk_new" });
    const written = JSON.parse((mockWriteFileSync.mock.calls[0]![1] as string));
    expect(written.username).toBe("existing_user");
    expect(written.base_url).toBe("https://example.com");
    expect(written.api_key).toBe("mbk_new");
  });
});

describe("getBaseUrl()", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.MISARBLOG_BASE_URL;
    mockReadFileSync.mockImplementation(() => { throw new Error("ENOENT"); });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns default API URL when no env or config", () => {
    expect(getBaseUrl()).toBe("https://api.misar.io/blog/v1");
  });

  it("uses MISARBLOG_BASE_URL env var with /api/v1 appended", () => {
    process.env.MISARBLOG_BASE_URL = "https://custom.misar.blog";
    expect(getBaseUrl()).toBe("https://custom.misar.blog/api/v1");
  });

  it("strips trailing slash from env URL before appending /api/v1", () => {
    process.env.MISARBLOG_BASE_URL = "https://custom.misar.blog/";
    expect(getBaseUrl()).toBe("https://custom.misar.blog/api/v1");
  });

  it("uses base_url from config file with /api/v1 appended", () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({ base_url: "https://self-hosted.example.com" }) as unknown as Buffer);
    expect(getBaseUrl()).toBe("https://self-hosted.example.com/api/v1");
  });

  it("env var takes precedence over config file base_url", () => {
    process.env.MISARBLOG_BASE_URL = "https://env-url.example.com";
    mockReadFileSync.mockReturnValue(JSON.stringify({ base_url: "https://config-url.example.com" }) as unknown as Buffer);
    expect(getBaseUrl()).toBe("https://env-url.example.com/api/v1");
  });
});

describe("loadConfig() — malformed JSON", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.MISARBLOG_API_KEY;
  });

  it("returns empty object and does not throw when config is malformed JSON", () => {
    mockReadFileSync.mockReturnValue("{ this is not json" as unknown as Buffer);
    // getApiKey() uses loadConfig() internally — if malformed JSON throws, getApiKey() should still throw "Not configured"
    expect(() => getApiKey()).toThrow("Not configured");
  });
});

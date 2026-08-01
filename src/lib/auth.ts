import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const CONFIG_PATH = join(homedir(), ".misarblog", "config.json");

interface MisarConfig {
  api_key?: string;
  username?: string;
  base_url?: string;
}

function loadConfig(): MisarConfig {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as MisarConfig;
  } catch {
    return {};
  }
}

export function saveConfig(config: MisarConfig): void {
  mkdirSync(join(homedir(), ".misarblog"), { recursive: true });
  const existing = loadConfig();
  writeFileSync(CONFIG_PATH, JSON.stringify({ ...existing, ...config }, null, 2), "utf8");
}

export function getApiKey(): string {
  const envKey = process.env.MISARBLOG_API_KEY?.trim();
  if (envKey) return envKey;

  const cfg = loadConfig();
  if (cfg.api_key) return cfg.api_key;

  throw new Error(
    "Not configured. Run the login tool to connect via browser, or set MISARBLOG_API_KEY."
  );
}

export function tryGetApiKey(): string | null {
  try {
    return getApiKey();
  } catch {
    return null;
  }
}

export function getBaseUrl(): string {
  const envUrl = (process.env.MISARBLOG_BASE_URL ?? "").trim();
  if (envUrl) return envUrl.replace(/\/$/, "") + "/api/v1";

  const cfg = loadConfig();
  if (cfg.base_url) return cfg.base_url.replace(/\/$/, "") + "/api/v1";

  return "https://api.misar.io/blog/v1";
}

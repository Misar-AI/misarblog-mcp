import { apiFetch } from "./lib/api-client.js";

/**
 * MCP resources — read-only context a client can attach directly, without
 * spending a tool call. Kept small and cheap: some clients fetch every resource
 * eagerly, so anything large or paginated belongs in a tool instead.
 */

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  read: () => Promise<unknown>;
}

export const RESOURCES: ResourceDefinition[] = [
  {
    uri: "misarblog://profile",
    name: "Creator profile",
    description:
      "Your Misar.Blog profile — username, display name, bio, and payout status. Read this to get the author URL and handle right before writing anything public.",
    mimeType: "application/json",
    read: () => apiFetch("/profile"),
  },
  {
    uri: "misarblog://articles/recent",
    name: "Recent published articles",
    description:
      "Your 20 most recent published articles. Useful as a style and coverage reference so a new draft neither repeats nor contradicts existing work.",
    mimeType: "application/json",
    read: () => apiFetch("/articles?status=published&limit=20"),
  },
  {
    uri: "misarblog://articles/drafts",
    name: "Open drafts",
    description: "Your unpublished drafts, so work in progress can be resumed rather than restarted.",
    mimeType: "application/json",
    read: () => apiFetch("/articles?status=draft&limit=20"),
  },
  {
    uri: "misarblog://series",
    name: "Article series",
    description: "Your series and the articles in each, in order.",
    mimeType: "application/json",
    read: () => apiFetch("/series"),
  },
  {
    uri: "misarblog://analytics/summary",
    name: "Analytics summary",
    description:
      "Views, revenue, and subscriber counts for the last 30 days — the baseline for any performance question.",
    mimeType: "application/json",
    read: () => apiFetch("/analytics/summary?days=30"),
  },
];

const BY_URI = new Map(RESOURCES.map((r) => [r.uri, r]));

export function listResources() {
  return RESOURCES.map(({ uri, name, description, mimeType }) => ({
    uri,
    name,
    description,
    mimeType,
  }));
}

export async function readResource(uri: string) {
  const resource = BY_URI.get(uri);
  if (!resource) return null;
  const data = await resource.read();
  return {
    contents: [{ uri, mimeType: resource.mimeType, text: JSON.stringify(data, null, 2) }],
  };
}

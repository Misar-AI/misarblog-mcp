import { describe, it, expect } from "vitest";
import { buildServer, describeServer } from "../../src/server.js";
import { PROMPTS, listPrompts, getPrompt } from "../../src/prompts.js";
import { RESOURCES, listResources } from "../../src/resources.js";

const LOCAL_ONLY = ["login", "status", "upload_image"];

describe("server catalogue", () => {
  it("registers more tools on stdio than on HTTP, by exactly the local-only set", () => {
    const stdio = describeServer({ includeLocalTools: true }).tools.map((t) => t.name);
    const http = describeServer({ includeLocalTools: false }).tools.map((t) => t.name);

    expect(stdio.length - http.length).toBe(LOCAL_ONLY.length);
    for (const name of LOCAL_ONLY) {
      expect(stdio, `${name} should be on stdio`).toContain(name);
      // These touch the caller's browser, terminal, or filesystem — advertising
      // them on the hosted endpoint promises something that cannot work there.
      expect(http, `${name} must not be exposed over HTTP`).not.toContain(name);
    }
  });

  it("exposes every tool with a snake_case name and a description", () => {
    for (const tool of describeServer({ includeLocalTools: true }).tools) {
      expect(tool.name).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(tool.description.length).toBeGreaterThan(10);
    }
  });

  it("covers every tool the three pre-consolidation implementations served", () => {
    // Union of the npm package (23), /api/mcp (20) and /api/v1/mcp (15).
    const shipped = [
      "get_profile", "get_analytics_summary", "list_my_articles", "get_article",
      "publish_article", "create_draft", "update_article", "search_articles",
      "get_series", "create_series", "add_to_series",
      "research_topic", "generate_title_seo", "suggest_titles", "generate_cover_image",
      "list_comments", "get_follow_status", "get_reactions", "add_reaction",
      "remove_reaction", "list_newsletter_subscribers", "list_newsletter_issues",
      "upload_image", "login", "status", "upgrade",
    ];
    const names = describeServer({ includeLocalTools: true }).tools.map((t) => t.name);
    for (const name of shipped) expect(names, `${name} was dropped`).toContain(name);
  });

  it("reports a stable server identity", () => {
    const described = describeServer();
    expect(described.name).toBe("misarblog");
    expect(described.transport).toBe("streamable-http");
  });
});

describe("describeServer introspection contract", () => {
  it("still finds the SDK's registries", () => {
    // describeServer reads McpServer's private `_registered*` maps because the
    // SDK exposes no public enumeration. This test is the tripwire: if an SDK
    // upgrade renames them, the metadata endpoint would silently start
    // reporting an empty catalogue to every directory that scrapes it.
    const server = buildServer({ includeLocalTools: true }) as unknown as Record<string, unknown>;
    for (const field of ["_registeredTools", "_registeredPrompts", "_registeredResources"]) {
      expect(server[field], `SDK no longer exposes ${field}`).toBeTypeOf("object");
      expect(Object.keys(server[field] as object).length).toBeGreaterThan(0);
    }
  });

  it("never reports an empty catalogue", () => {
    const described = describeServer({ includeLocalTools: false });
    expect(described.tools.length).toBeGreaterThan(20);
    expect(described.prompts.length).toBe(PROMPTS.length);
    expect(described.resources.length).toBe(RESOURCES.length);
  });
});

describe("prompts", () => {
  it("lists every prompt with its arguments", () => {
    expect(listPrompts()).toHaveLength(PROMPTS.length);
    for (const prompt of listPrompts()) {
      expect(prompt.description.length).toBeGreaterThan(10);
    }
  });

  it("only references tools that actually exist", () => {
    // A prompt naming a renamed or dropped tool sends the agent chasing nothing.
    const known = new Set(describeServer({ includeLocalTools: true }).tools.map((t) => t.name));
    for (const prompt of PROMPTS) {
      const body = prompt.build({});
      for (const match of body.matchAll(/\b([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\b/g)) {
        const word = match[1]!;
        // Only check words that look like tool calls, i.e. followed by "(" or
        // preceded by "call ". Anything else is prose.
        if (new RegExp(`call ${word}\\b`).test(body)) {
          expect(known.has(word), `prompt "${prompt.name}" references unknown tool ${word}`).toBe(
            true,
          );
        }
      }
    }
  });

  it("builds a usable body when no arguments are supplied", () => {
    for (const prompt of PROMPTS) {
      expect(getPrompt(prompt.name)!.messages[0]!.content.text.length).toBeGreaterThan(80);
    }
  });

  it("returns null for an unknown prompt", () => {
    expect(getPrompt("nope")).toBeNull();
  });
});

describe("resources", () => {
  it("exposes misarblog:// URIs with a mime type", () => {
    for (const resource of listResources()) {
      expect(resource.uri).toMatch(/^misarblog:\/\//);
      expect(resource.mimeType).toBe("application/json");
      expect(resource.description.length).toBeGreaterThan(10);
    }
  });
});

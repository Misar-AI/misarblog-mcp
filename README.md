# @misarblog/mcp — Misar.Blog MCP Server

**Publish & manage your blog from Claude Code, Cursor, or Windsurf**

[![npm version](https://img.shields.io/npm/v/@misarblog/mcp.svg)](https://www.npmjs.com/package/@misarblog/mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/@misarblog/mcp.svg)](https://nodejs.org/)
[![Smithery](https://smithery.ai/badge/misar/misarblog-mcp)](https://smithery.ai/server/misar/misarblog-mcp)

Publish blog posts, manage drafts, organize series, run AI research/title/cover-image
generation, and pull analytics — all from your AI coding environment. Connect your
[Misar.Blog](https://www.misar.blog) creator account via an API key or the one-click
`login` browser flow (no copy-paste).

The stdio package exposes **23 tools**. On the hosted
[Smithery](https://smithery.ai/server/misar/misarblog-mcp) remote (streamable-HTTP), **20**
are available — the three local-only tools (`login`, `status`, `upload_image`) require a
local process and are not exposed over remote HTTP.

---

## Installation

### Claude Code

```bash
claude mcp add misarblog -- npx -y @misarblog/mcp
```

Then set your API key:

```bash
export MISARBLOG_API_KEY=mbk_your_key
```

### Manual configuration (Cursor, Windsurf, VS Code, any MCP client)

```json
{
  "mcpServers": {
    "misarblog": {
      "command": "npx",
      "args": ["-y", "@misarblog/mcp"],
      "env": {
        "MISARBLOG_API_KEY": "mbk_your_key"
      }
    }
  }
}
```

- **Cursor** — `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project)
- **Windsurf** — `~/.codeium/windsurf/mcp_config.json`
- **VS Code (Copilot)** — `.vscode/mcp.json`, add `"type": "stdio"` to the server entry

### Hosted remote (no local install)

Install the hosted server straight from Smithery — it runs the package for you and connects
over streamable-HTTP:

```bash
npx -y @smithery/cli install misar/misarblog-mcp --client claude
```

Or add the remote endpoint directly and authenticate with a Bearer API key:

```
https://www.misar.blog/api/mcp
Authorization: Bearer mbk_your_key
```

---

## Authentication

**Option 1 — API key (recommended).** Generate a key at
**[Dashboard → Settings → API Keys](https://www.misar.blog/dashboard/settings/api-keys)**
(it starts with `mbk_`), then set `MISARBLOG_API_KEY`. Keys are rate-limited to 100 req/min
and can be revoked or regenerated at any time.

**Option 2 — browser login (stdio only).** Omit `MISARBLOG_API_KEY` and call the `login`
tool as your first request. It starts a temporary `127.0.0.1` listener, opens
`https://www.misar.blog/dashboard/settings/api?mcp_port=<port>`, and saves the returned key
to `~/.misarblog/config.json` — no clipboard involved. The listener is local-only and shuts
down after 120 seconds.

---

## Tools

**23 tools** over stdio; the **20** marked ✓ are also available on the Smithery remote.

| Area | Tools | Remote |
|------|-------|:------:|
| Connection & account | `login`, `status` | — |
|  | `get_profile` | ✓ |
| Articles & drafts | `list_my_articles`, `get_article`, `publish_article`, `create_draft` | ✓ |
| Series | `get_series`, `create_series`, `add_to_series` | ✓ |
| AI writing | `research_topic`, `generate_title_seo`, `suggest_titles` | ✓ |
| Images | `upload_image` | — |
|  | `generate_cover_image` | ✓ |
| Analytics | `get_analytics_summary` | ✓ |
| Comments & follows | `list_comments`, `get_follow_status` | ✓ |
| Reactions | `get_reactions`, `add_reaction`, `remove_reaction` | ✓ |
| Newsletter | `list_newsletter_subscribers`, `list_newsletter_issues` | ✓ |

Full parameter tables, return shapes, and example prompts live in the
**[MCP Tools Reference](https://docs.misar.io/blog)**.

---

## Usage examples

Prompts you can send directly in Claude Code or Cursor Agent mode:

```text
Write a 1000-word article about "Why AI-first blogging changes SEO forever"
and publish it on my Misar.Blog with tags ["AI", "SEO", "blogging"].
```

```text
Generate a dark, futuristic cover image for an article titled "Building with MCP",
then create a draft with that image as the cover.
```

```text
List my published articles, create a series called "AI Writing Guide",
and add the last 3 to it in chronological order.
```

```text
Show me my analytics for the last 90 days.
```

---

## Self-hosted Misar.Blog

Point the server at your own instance with `MISARBLOG_BASE_URL`:

```json
{
  "mcpServers": {
    "misarblog": {
      "command": "npx",
      "args": ["-y", "@misarblog/mcp"],
      "env": {
        "MISARBLOG_API_KEY": "mbk_your_key",
        "MISARBLOG_BASE_URL": "https://blog.yourdomain.com"
      }
    }
  }
}
```

---

## Requirements

- **Node.js** >= 18 (package fetched automatically via `npx`)
- A [Misar.Blog](https://www.misar.blog) creator account
- An API key from your [dashboard](https://www.misar.blog/dashboard/settings/api-keys), or the `login` tool

---

## Links

- **Homepage** — https://www.misar.blog
- **Smithery** — https://smithery.ai/server/misar/misarblog-mcp
- **Docs** — https://docs.misar.io/blog
- **npm** — https://www.npmjs.com/package/@misarblog/mcp
- **Source** — https://git.misar.io/misaradmin/misar-io (`packages/blog-mcp-server/`)

## License

MIT — Copyright (c) 2026 Misar AI Technology Pvt Ltd

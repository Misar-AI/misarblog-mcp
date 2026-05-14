# @misarblog/mcp — Misar.Blog MCP Server

**Publish & Manage Blog Posts from Claude Code**

[![npm version](https://img.shields.io/npm/v/@misarblog/mcp.svg)](https://www.npmjs.com/package/@misarblog/mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/@misarblog/mcp.svg)](https://nodejs.org/)

Publish blog posts, manage drafts, schedule articles, generate AI cover images, and pull analytics — all from Claude Code, Cursor, or Windsurf. Connect your [Misar.Blog](https://www.misar.blog) creator account via API key or one-click browser login (no copy-paste). 15 tools covering the full editorial workflow: write → draft → publish → series → analytics.

## Installation

### Claude Code

```bash
claude mcp add misarblog -- npx -y @misarblog/mcp
```

Then set your API key:

```bash
export MISARBLOG_API_KEY=mbk_your_key
```

### Manual Configuration

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

## Tools (15)

| Tool | Description |
|------|-------------|
| `publish_article` | Publish a new article or update an existing draft to published |
| `create_draft` | Create a new draft article with title, content, tags, and series |
| `get_article` | Fetch a single article by slug or ID |
| `list_my_articles` | List your articles with optional status/tag/series filters |
| `upload_image` | Upload an image to your article media library |
| `generate_cover_image` | Generate an AI cover image for an article using a prompt |
| `get_series` | Fetch a series by slug, including all articles in order |
| `create_series` | Create a new article series |
| `add_to_series` | Add an article to a series at a specific position |
| `get_analytics_summary` | Get traffic, views, and engagement analytics for your articles |
| `get_profile` | Fetch your Misar.Blog creator profile |
| `login` | Authenticate via browser (opens OAuth flow, no API key needed) |
| `get_reactions` | Get reaction counts for an article |
| `add_reaction` | Add a reaction (like/clap/bookmark) to an article |
| `remove_reaction` | Remove a reaction from an article |

## Requirements

- Node.js >= 18
- A [Misar.Blog](https://www.misar.blog) creator account
- API key from your Misar.Blog dashboard (or use `login` tool for browser OAuth)

## Authentication

**Option 1: API Key (recommended)**
Get your API key from your [Misar.Blog dashboard](https://www.misar.blog/dashboard/api) and set:
```bash
export MISARBLOG_API_KEY=mbk_your_key
```

**Option 2: Browser OAuth**
Use the `login` tool in your MCP client — it opens a browser window for one-click authentication.

## Links

- **Homepage**: https://www.misar.blog
- **Docs**: https://docs.misar.io/blog
- **npm**: https://www.npmjs.com/package/@misarblog/mcp
- **Source**: https://git.misar.io/misaradmin/misar-io (packages/blog-mcp-server/)

## License

MIT — Copyright (c) 2025 G1 Technologies / Misar AI

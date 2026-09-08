# Distribution Assets — @misarblog/mcp

Pre-written copy for each marketplace/registry. Paste verbatim where noted.

---

## npm

Package: `@misarblog/mcp`
Publish: `npm publish --access public` (from packages/mcp-server/)

Keywords set in package.json — npm indexes these for search.

---

## Smithery.ai

URL: https://smithery.ai/server/@misarblog/mcp

Smithery auto-discovers the package from npm. After publishing:
1. Visit https://smithery.ai and search `@misarblog/mcp`
2. If not auto-indexed, submit via: https://smithery.ai/submit
3. `smithery.yaml` in this directory provides the config schema + launch command.

**Short title** (Smithery listing header):
```
Misar.Blog — Publish & Manage Blog Posts from Claude Code
```

**Description** (Smithery listing body, 500 chars):
```
Publish blog posts, manage drafts, schedule articles, generate AI cover
images, and pull analytics — all from Claude Code, Cursor, or Windsurf.
Connect your Misar.Blog creator account via API key or one-click browser
login (no copy-paste). 12 tools covering the full editorial workflow:
write → draft → publish → series → analytics.
```

**Category**: Content & Writing
**Tags**: blogging, content-publishing, ai-writing, markdown, analytics, seo, editorial

---

## MCP.so

Submit at: https://mcp.so/submit  (GitHub PR to their repo)

**PR title**: `Add @misarblog/mcp — blogging & content publishing MCP server`

**Entry** (add to their servers list):
```markdown
### Misar.Blog

**npm**: `@misarblog/mcp` · **Runtime**: Node 18+ (npx) or Python 3.11+

Publish blog posts, manage drafts, generate AI cover images, schedule
articles, and pull analytics from your [Misar.Blog](https://www.misar.blog)
account — all from Claude Code, Cursor, or Windsurf.

**Tools**: publish_article · create_draft · get_article · list_my_articles ·
upload_image · generate_cover_image · get_series · create_series ·
add_to_series · get_analytics_summary · get_profile · login

**Quick start**:
\`\`\`json
{
  "mcpServers": {
    "misarblog": {
      "command": "npx",
      "args": ["-y", "@misarblog/mcp"],
      "env": { "MISARBLOG_API_KEY": "mbk_your_key" }
    }
  }
}
\`\`\`

**Links**: [npm](https://www.npmjs.com/package/@misarblog/mcp) ·
[Docs](https://www.misar.blog) · [Source](https://git.misar.io/misaradmin/MisarBlog)
```

---

## Glama.ai

Submit at: https://glama.ai/mcp/servers/submit

**Name**: Misar.Blog MCP Server
**npm package**: @misarblog/mcp
**Homepage**: https://www.misar.blog
**Repository**: https://git.misar.io/misaradmin/MisarBlog
**Category**: Content & Productivity

**Short description** (160 chars):
```
Publish blog posts, manage drafts, generate AI cover images, and pull
analytics from Misar.Blog using Claude Code, Cursor, or Windsurf.
```

**Long description**:
```
The Misar.Blog MCP server gives AI coding assistants full control over
your blogging workflow. Write an article in Claude Code, publish it
instantly, or save it as a draft for review — all without leaving your
editor.

Key capabilities:
• Publish or schedule articles (Markdown, tags, visibility, cover image)
• Create and retrieve drafts
• Generate AI-powered cover images from a text prompt
• Upload local images to the Misar.Blog CDN
• Organize articles into series
• Pull analytics: views, revenue, and subscriber trends (up to 365 days)
• One-click browser login — no API key copy-paste required

Works with Claude Code, Cursor, Windsurf, VS Code Copilot, and any
MCP-compatible client. Two runtimes: Python (stdlib only) or npm/npx.
```

---

## PulseMCP / mcp.run

Submit at: https://www.pulsemcp.com/submit or https://mcp.run

**Package**: @misarblog/mcp
**Tagline**: Publish blog posts and manage your Misar.Blog content from any AI coding assistant

---

## awesome-mcp-servers (GitHub PRs)

### 1. punkpeye/awesome-mcp-servers
Repo: https://github.com/punkpeye/awesome-mcp-servers
Section: **Productivity** or **Content & Writing**

Add this line:
```markdown
- [Misar.Blog](https://www.npmjs.com/package/@misarblog/mcp) - Publish blog posts, manage drafts, generate AI cover images, schedule articles, and pull analytics from Misar.Blog. Works with Claude Code, Cursor and Windsurf. `TypeScript` `Python`
```

### 2. appcypher/awesome-mcp-servers
Repo: https://github.com/appcypher/awesome-mcp-servers
Section: **Content Management**

Add this line:
```markdown
- [misarblog-mcp](https://www.npmjs.com/package/@misarblog/mcp) - MCP server for Misar.Blog: publish articles, manage drafts, generate AI images, and access analytics from Claude Code and Cursor. `TypeScript` `Python`
```

### 3. wong2/awesome-mcp-servers
Repo: https://github.com/wong2/awesome-mcp-servers

Add this line:
```markdown
- [Misar.Blog MCP](https://www.npmjs.com/package/@misarblog/mcp) 📝 - Publish and manage blog posts from Claude Code, Cursor, or Windsurf via Misar.Blog.
```

---

## Claude.ai Integrations Directory

Submit via: https://claude.ai/integrations (after Anthropic opens public submissions)

**Integration name**: Misar.Blog
**Tagline**: Write and publish blog posts from Claude
**Config**:
```json
{
  "command": "npx",
  "args": ["-y", "@misarblog/mcp"],
  "env": { "MISARBLOG_API_KEY": "<your key>" }
}
```

---

## Twitter/X Launch Thread (copy-paste)

```
🚀 Introducing @misarblog/mcp — the first MCP server for bloggers.

Publish blog posts, manage drafts, generate AI cover images, and pull
analytics — all from Claude Code, Cursor, or Windsurf.

Zero-dependency Python or npm/npx. 12 tools. One browser-login flow.

npx -y @misarblog/mcp

🧵 Thread:
```

Tweet 2:
```
12 tools in one MCP server:

✍️ publish_article — write + ship in one step
📝 create_draft — save for review
🎨 generate_cover_image — AI art from a prompt
📊 get_analytics_summary — views, revenue, subscribers
📚 Series management
🔑 Browser login — no key copy-paste

All from your terminal or editor.
```

Tweet 3:
```
Add to Claude Code in 30 seconds:

{
  "mcpServers": {
    "misarblog": {
      "command": "npx",
      "args": ["-y", "@misarblog/mcp"],
      "env": { "MISARBLOG_API_KEY": "mbk_..." }
    }
  }
}

Get your key → misar.blog/dashboard/settings/api
```

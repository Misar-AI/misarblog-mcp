# Misar.Blog MCP Server

> Publish and manage articles, series, comments, reactions, newsletters, and analytics — from any AI assistant.

[![npm](https://img.shields.io/npm/v/@misarblog/mcp)](https://www.npmjs.com/package/@misarblog/mcp)
[![smithery](https://img.shields.io/badge/smithery-misar%2Fmisarblog--mcp-blue)](https://smithery.ai/server/misar/misarblog-mcp)
[![license](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

**23 tools · 8 prompts · 5 resources · 6 agent skills**

Works with Claude (Desktop, Code, and web), Cursor, VS Code, Windsurf, Cline,
Zed, Gemini CLI, ChatGPT, and any other MCP-compatible client — over stdio or
Streamable HTTP.

---

## Install

### Smithery (recommended)

```bash
npx -y @smithery/cli install misar/misarblog-mcp --client claude
```

### Claude Code

```bash
claude mcp add misarblog -- npx -y @misarblog/mcp@latest
```

### Manual (any client)

```json
{
  "mcpServers": {
    "misarblog": {
      "command": "npx",
      "args": ["-y", "@misarblog/mcp@latest"],
      "env": { "MISARBLOG_API_KEY": "mbk_your_key_here" }
    }
  }
}
```

Ready-made configs for every client live in [`connectors/`](./connectors).

### Remote (no install)

```json
{
  "mcpServers": {
    "misarblog": {
      "type": "streamable-http",
      "url": "https://api.misar.io/blog/mcp",
      "headers": { "Authorization": "Bearer mbk_your_key_here" }
    }
  }
}
```

---

## Authentication

Two options — no copy-paste needed for the first:

1. **Browser login.** Start the server with no key and run the `login` tool.
   It opens the Misar.Blog consent screen, you review the requested
   permissions, and the key is delivered straight back and saved to
   `~/.misarblog/config.json`.
2. **API key.** Create one at https://www.misar.blog/dashboard/settings/api-keys and set `MISARBLOG_API_KEY`.

Self-hosted instances: set `MISARBLOG_BASE_URL`.

---

## Tools

| Tool | Description |
| --- | --- |
| `upgrade` | Show your current Misar.Blog plan, how much of each quota you have left, and what upgrading unlocks. |
| `get_profile` | Get your Misar.Blog creator profile. |
| `get_analytics_summary` | Get analytics summary (views, revenue, subscribers) for a time period. |
| `list_my_articles` | List your articles on Misar.Blog. |
| `get_article` | Get a single article by slug, including full markdown content. |
| `publish_article` | Publish a new article (or schedule it) on Misar.Blog. |
| `create_draft` | Save an article as a draft on Misar.Blog (for review before publishing). |
| `update_article` | Update the title, body, or tags of an existing article or draft. |
| `search_articles` | Search PUBLISHED articles across Misar.Blog by keyword, tag, or author — including other creators' work. |
| `research_topic` | Research a topic and get AI-generated insights, sources, and a content outline. |
| `generate_title_seo` | Generate 5 SEO/AEO/GEO-optimized article titles from a topic or keyword prompt. |
| `suggest_titles` | Generate 5 compelling, SEO-friendly article title options from your existing article content. |
| `generate_cover_image` | Generate a cover image using AI and upload it to the Misar.Blog CDN. |
| `get_series` | List all your series on Misar.Blog. |
| `create_series` | Create a new series to group related articles. |
| `add_to_series` | Add an existing article to a series. |
| `list_comments` | Get public comments for an article. |
| `get_follow_status` | Get public follow status and follower count for a user by their profile UUID. |
| `list_newsletter_subscribers` | Get your newsletter subscriber list. |
| `list_newsletter_issues` | Get your sent and scheduled newsletter issues. |
| `get_reactions` | Get reaction counts and your reactions for an article. |
| `add_reaction` | Add a reaction to an article. |
| `remove_reaction` | Remove a specific reaction from an article. |

## Prompts

Reusable workflows your client exposes as slash-commands.

| Prompt | Description |
| --- | --- |
| `draft_article` | Write a complete, SEO-optimised article draft and save it to Misar.Blog. |
| `improve_seo` | Audit an article for SEO/AEO/GEO and apply the improvements. |
| `write_newsletter` | Draft a newsletter issue from recent published articles. |
| `article_ideas` | Generate article ideas grounded in what has and has not been covered. |
| `social_caption` | Write platform-specific promotional captions for an article. |
| `optimize_headline` | Generate and rank stronger headline options for an article. |
| `series_plan` | Plan a multi-part article series and set it up on Misar.Blog. |
| `engagement_report` | Summarise blog performance and recommend what to do next. |

## Resources

Read-only context an agent can attach without spending a tool call.

| URI | Description |
| --- | --- |
| `misarblog://profile` | Your Misar.Blog profile — username, display name, bio, and payout status. |
| `misarblog://articles/recent` | Your 20 most recent published articles. |
| `misarblog://articles/drafts` | Your unpublished drafts, so work in progress can be resumed rather than restarted.. |
| `misarblog://series` | Your series and the articles in each, in order.. |
| `misarblog://analytics/summary` | Views, revenue, and subscriber counts for the last 30 days — the baseline for any performance question.. |

## Agent skills

Bundled in [`skills/`](./skills) — guidance an agent loads when a task matches.

| Skill | Use when |
| --- | --- |
| `blog-analytics-report` | Report on Misar.Blog performance — views, revenue, subscribers, engagement. Use for "how is my blog doing", traffic reports, or content performance analysis. |
| `manage-article-series` | Plan and manage a multi-part article series on Misar.Blog. Use for "series", "multi-part", "part 2", or organising related posts into a sequence. |
| `newsletter-campaign-report` | Draft and review Misar.Blog newsletter issues and subscriber performance. Use for "newsletter", "email my subscribers", or newsletter performance questions. |
| `promote-article` | Write platform-specific promotional copy for a Misar.Blog article. Use for "share this post", "social caption", "promote my article", or writing X/LinkedIn/Reddit copy. |
| `publish-blog-post` | Write, draft, and publish an article on Misar.Blog. Use when the user wants to write a post, publish an article, save a draft, or turn notes into a blog post. |
| `seo-optimize-article` | Audit and improve an existing Misar.Blog article for SEO, AEO, and AI-answer-engine citability. Use for "improve SEO", "why isn't this ranking", "meta description", or "optimise for AI search". |

---

## Safety

Destructive and irreversible actions are annotated (`destructiveHint`) so
clients can prompt before running them. The skills instruct agents to confirm
before anything that sends mail, publishes content, or is otherwise visible to
other people.

Discovery (`initialize`, `tools/list`, `prompts/list`, `resources/list`)
never requires credentials, so registries can index the server without one.
Every action does.

---

## Links

- Website — https://www.misar.blog
- App — https://www.misar.blog
- Documentation — https://docs.misar.io/blog
- Smithery — https://smithery.ai/server/misar/misarblog-mcp
- npm — https://www.npmjs.com/package/@misarblog/mcp
- Source — https://github.com/mrgulshanyadav/misarblog-mcp

MIT © [Misar AI](https://misar.io)

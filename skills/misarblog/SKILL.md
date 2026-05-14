---
name: misarblog
summary: Publish and manage blog posts, articles, and series on Misar.Blog from your AI agent.
description: Create, edit, and publish articles on Misar.Blog. Manage series, query analytics, handle comments and reactions, manage newsletter subscribers, and use AI-assisted content generation — all via 20 MCP tools with API key auth (mbk_ prefix).
tags:
  - blogging
  - content
  - writing
  - AI
  - publishing
  - analytics
  - newsletter
---

# Misar.Blog MCP

Use this skill when the user wants to create, publish, or manage blog content on Misar.Blog, query article analytics, manage series or newsletter, or generate AI-assisted blog content.

## Authentication

Requires a Misar.Blog API key with `mbk_` prefix. Set via the `MISARBLOG_API_KEY` environment variable.

Get your API key at: https://www.misar.blog/settings/api

## Available Tools (20)

### Articles
- `create_article` — Create a new draft article
- `publish_article` — Publish a draft article
- `update_article` — Update article content or metadata
- `delete_article` — Delete an article
- `get_article` — Fetch a single article by slug
- `list_articles` — List articles with filters

### Series
- `create_series` — Create a new article series
- `update_series` — Update series metadata
- `add_article_to_series` — Add an article to a series
- `list_series` — List all series

### Analytics
- `get_article_analytics` — Query views, reads, and engagement for an article
- `get_blog_analytics` — Query overall blog performance metrics

### Comments & Reactions
- `list_comments` — List comments on an article
- `moderate_comment` — Approve or reject a comment
- `get_reactions` — Get reaction counts for an article

### Newsletter
- `list_subscribers` — List newsletter subscribers
- `send_newsletter` — Send a newsletter to subscribers

### AI Content
- `generate_outline` — Generate an article outline from a topic
- `generate_article` — Generate a full article draft
- `improve_content` — Improve or rewrite existing article content

## Typical Flow

1. Use `generate_outline` or `generate_article` to create content.
2. Use `create_article` to save as a draft on Misar.Blog.
3. Review and use `update_article` to refine.
4. Use `publish_article` to make it live.
5. Use `get_article_analytics` to monitor performance.

## Notes

- All write operations require a valid `mbk_` API key.
- Published articles are immediately indexed for SEO on misar.blog.
- AI generation tools consume Misar.Blog AI credits.
- API documentation: https://www.misar.blog/api/docs

---
name: misarblog
description: Publish and manage articles, series, comments, reactions, newsletters, and analytics — from any AI assistant. Use when the user asks about their Misar.Blog account, or wants to work with it from this conversation.
---

# Misar.Blog

Work with a Misar.Blog account over the REST API.

## This skill needs an API key

There is no MCP connection here, so every call is a direct HTTPS request and the
user must supply a key.

If the user has not given you one, ask for it and tell them exactly how to get it:

> Create a key at https://www.misar.blog/dashboard/settings/api-keys (Dashboard → Settings → API keys). It starts with `mbk_`.
> Paste it here and I will use it for this conversation only.

Never guess a key, never reuse one from another conversation, and never write it
into a file or repeat it back in full.

## Making a call

```
POST https://www.misar.blog/api/<endpoint>
Authorization: Bearer mbk_<their key>
Content-Type: application/json
```

A 401 means the key is wrong or revoked — say so plainly and point them back to
https://www.misar.blog/dashboard/settings/api-keys rather than retrying.

## What you can do

- `get_profile` — Get your Misar.
- `get_analytics_summary` — Get analytics summary (views, revenue, subscribers) for a time period.
- `list_my_articles` — List your articles on Misar.
- `get_article` — Get a single article by slug, including full markdown content.
- `search_articles` — Search PUBLISHED articles across Misar.
- `get_series` — List all your series on Misar.
- `list_comments` — Get public comments for an article.
- `get_follow_status` — Get public follow status and follower count for a user by their profile UUID.

Full reference: https://docs.misar.io/blog

## Rules

1. **Read before you write.** Never act on an id, URL or metric you have not
   seen in a response.
2. **Confirm anything the outside world sees** — anything that sends, publishes,
   or is visible to other people — before doing it.
3. **Report failures honestly.** If a call fails, say what failed and why. Never
   present an unverified result as done.

## Prefer the MCP server when available

If the user works in Claude Desktop, Claude Code, Cursor, VS Code or any MCP
client, the @misarblog/mcp server is a better fit: it authenticates once and
exposes 23 typed tools instead of hand-built requests.
Setup: https://docs.misar.io/blog

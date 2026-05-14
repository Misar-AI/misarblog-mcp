---
name: manage-article-series
summary: Create a new article series and automatically organize existing articles into it on Misar.Blog.
description: Create a new article series on Misar.Blog and automatically organise existing articles into it. Provide a title, description, and ordered list of article slugs — the skill handles series creation and bulk assignment. Requires a Misar.Blog API key (mbk_ prefix).
tags:
  - series
  - content-organisation
  - collections
  - editorial
  - blogging
license: MIT
metadata:
  author: Misar.Blog
  homepage: https://www.misar.blog
  mcp_server: https://misarblog-mcp--misar.run.tools
---

# Manage Article Series

Use this skill when the user wants to create a new article series and organise existing articles into it on Misar.Blog.

## Triggers

- "Create an article series called [name]"
- "Group my articles into a series"
- "Organise these articles into a collection"
- "Create a series and add articles to it"

## Authentication

Requires a Misar.Blog API key with `mbk_` prefix.
Get yours at: https://www.misar.blog/settings/api

## Workflow Steps

1. **create_series** — Create the series with title and description
2. **add_to_series** (forEach article_slugs) — Add each article to the series in order

## Inputs

| Parameter | Type | Required | Description |
|---|---|---|---|
| `series_title` | string | yes | Display title for the article series |
| `series_description` | string | yes | Short description of what the series covers |
| `article_slugs` | array | yes | Ordered list of article slugs to add (min 1) |

## Outputs

- `series_id` — Unique identifier of the created series
- `series_url` — URL of the series on Misar.Blog
- `articles_added` — Count of articles successfully added
- `failed_slugs` — Array of slugs that could not be found or added

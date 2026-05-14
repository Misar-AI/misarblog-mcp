---
name: publish-blog-post
summary: Research a topic and publish a complete SEO-optimized blog post on Misar.Blog in one automated workflow.
description: Research a topic and publish a complete, SEO-optimised blog post on Misar.Blog. The skill researches the topic, generates title options, creates a cover image, and publishes the final article in a single automated workflow. Requires a Misar.Blog API key (mbk_ prefix).
tags:
  - blogging
  - content-creation
  - publishing
  - seo
  - ai-writing
license: MIT
metadata:
  author: Misar.Blog
  homepage: https://www.misar.blog
  mcp_server: https://misarblog-mcp--misar.run.tools
---

# Publish Blog Post

Use this skill when the user wants to research a topic and publish a complete, SEO-optimised blog post on Misar.Blog in a single automated workflow.

## Triggers

- "Write a blog post about [topic]"
- "Publish an article on [topic] to my blog"
- "Research and publish [topic] on Misar.Blog"
- "Create SEO content about [topic] and post it"

## Authentication

Requires a Misar.Blog API key with `mbk_` prefix.
Get yours at: https://www.misar.blog/settings/api

## Workflow Steps

1. **research_topic** — Gather facts, angles, and SEO context for the topic
2. **suggest_titles** — Generate 5 optimised title options
3. **generate_cover_image** — Create an AI-generated cover image
4. **publish_article** — Publish the fully drafted article with selected title and cover

## Inputs

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `topic` | string | yes | — | Main topic or keyword to write about |
| `target_audience` | string | yes | general readers | Who the article is written for |
| `tone` | string | no | informative | informative / conversational / professional / humorous / authoritative |

## Outputs

- `article_url` — Published article URL on Misar.Blog
- `article_id` — Unique article identifier
- `title` — Final title selected for the article
- `cover_image_url` — URL of the generated cover image

## Example

User: Write a blog post about AI productivity tools for developers
Skill: Researches topic → Generates 5 titles → Creates cover → Publishes article
Output: https://www.misar.blog/@username/articles/ai-productivity-tools-for-developers-2025

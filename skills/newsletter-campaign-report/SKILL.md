---
name: newsletter-campaign-report
summary: Get a full summary of newsletter subscribers and recent issues with actionable insights on Misar.Blog.
description: Get a comprehensive summary of your Misar.Blog newsletter — subscriber counts, recent subscriber activity, and recent newsletter issues with engagement data. Formats actionable insights for growth and content strategy. Requires a Misar.Blog API key (mbk_ prefix).
tags:
  - newsletter
  - email
  - subscribers
  - campaigns
  - reporting
license: MIT
metadata:
  author: Misar.Blog
  homepage: https://www.misar.blog
  mcp_server: https://misarblog-mcp--misar.run.tools
---

# Newsletter Campaign Report

Use this skill when the user wants a summary of their Misar.Blog newsletter — subscribers, recent issues, and campaign performance insights.

## Triggers

- "Show me my newsletter stats"
- "How many subscribers do I have on Misar.Blog?"
- "Generate a newsletter report"
- "What were my recent newsletter issues?"
- "Newsletter performance summary"

## Authentication

Requires a Misar.Blog API key with `mbk_` prefix.
Get yours at: https://www.misar.blog/settings/api

## Workflow Steps

1. **list_newsletter_subscribers** — Fetch subscriber list and total count
2. **list_newsletter_issues** — Fetch recent newsletter issues and stats
3. **summarize_newsletter_report** — Combine data into actionable summary

## Inputs

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `subscriber_limit` | integer | no | 50 | Max recent subscribers to include (1–500) |

## Outputs

- `subscriber_count` — Total newsletter subscriber count
- `recent_subscribers` — Array of recent subscriber records
- `recent_issues` — Array of recent newsletter issues with stats
- `summary` — Summary object with growth rate and engagement insights

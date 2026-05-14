---
name: blog-analytics-report
summary: Generate a comprehensive analytics report for your Misar.Blog content for any time period (7d/30d/90d).
description: Generate a comprehensive analytics report for your Misar.Blog content. Fetches analytics summary, profile stats, and formats actionable insights for any time window — 7d, 30d, or 90d. Requires a Misar.Blog API key (mbk_ prefix).
tags:
  - analytics
  - reporting
  - insights
  - traffic
  - content-performance
license: MIT
metadata:
  author: Misar.Blog
  homepage: https://www.misar.blog
  mcp_server: https://misarblog-mcp--misar.run.tools
---

# Blog Analytics Report

Use this skill when the user wants a comprehensive analytics report for their Misar.Blog content, including traffic, engagement, top articles, and performance insights.

## Triggers

- "Show me my blog analytics"
- "How is my Misar.Blog performing?"
- "Generate a blog report for the last 30 days"
- "What are my top articles this month?"
- "Analytics summary for my blog"

## Authentication

Requires a Misar.Blog API key with `mbk_` prefix.
Get yours at: https://www.misar.blog/settings/api

## Workflow Steps

1. **get_analytics_summary** — Fetch views, reads, and engagement metrics
2. **get_profile** — Fetch profile stats and follower data
3. **format_analytics_insights** — Combine and format actionable insights

## Inputs

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `time_period` | string | yes | 30d | Time window: 7d, 30d, or 90d |

## Outputs

- `report_summary` — Overall metrics object (views, reads, engagement rate)
- `top_articles` — Array of best-performing articles
- `profile_stats` — Profile-level statistics
- `insights` — Array of actionable insight strings

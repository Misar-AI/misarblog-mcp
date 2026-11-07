---
name: blog-analytics-report
description: Report on Misar.Blog performance — views, revenue, subscribers, engagement. Use for "how is my blog doing", traffic reports, or content performance analysis.
---

# Blog performance report

## Gather

- `get_analytics_summary` — views, revenue, subscribers over a window
- `list_my_articles` (`status=published`) — what is live
- `get_reputation` (your own username) — upvotes received, reputation score,
  tier and badges: engagement beyond raw views
- `list_newsletter_subscribers` — audience growth

## Interpret

Views alone say little. Useful framings:

- **Views per article**, not just total — total rises simply by publishing more.
- **Which topics** earn views, so the next piece is informed rather than guessed.
- **Upvotes relative to views** — a high-view, low-upvote piece usually means
  the title over-promised. `get_reputation` reports upvotes received in total,
  not per article, so compare it with total views and say so. Do not call
  `upvote_article` or `save_article` to read a number: they change the account.
- **Subscriber growth against publishing cadence** — the honest test of whether
  the writing converts readers.

## Structure

Headline numbers; best and worst article each with a one-line reason; audience
growth; then the single highest-impact action for next month.

Under 400 words. State plainly when a figure was unavailable — never estimate
and present it as measured.

## Next steps

Ground recommendations in the data: if one topic outperforms, suggest a series
(`manage-article-series`). If a strong piece underperforms on views, that is an
SEO problem (`seo-optimize-article`), not a writing problem.

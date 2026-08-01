---
name: newsletter-campaign-report
description: Draft and review Misar.Blog newsletter issues and subscriber performance. Use for "newsletter", "email my subscribers", or newsletter performance questions.
---

# Newsletter issues and performance

## Drafting an issue

1. `list_my_articles` (`status=published`) for the articles to feature.
2. `list_newsletter_issues` to match the structure and voice of past issues —
   subscribers notice a format that suddenly changes.

For each featured article write a two-sentence hook that earns the click, using
its **real** URL from the API. Open with a short personal intro; close with one
call to action, not several.

If fewer articles are available than requested, say so rather than padding the
issue with filler.

## Reviewing performance

- `list_newsletter_issues` — what has been sent
- `list_newsletter_subscribers` — audience size and growth
- `get_analytics_summary` — revenue and traffic context

Compare issues against each other rather than against generic benchmarks: a
newsletter's own baseline is the only meaningful reference for whether an issue
landed.

## Do not

Fabricate open or click figures for an issue. Report only what the API returns,
and name what is missing.

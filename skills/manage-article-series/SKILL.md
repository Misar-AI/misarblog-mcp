---
name: manage-article-series
description: Plan and manage a multi-part article series on Misar.Blog. Use for "series", "multi-part", "part 2", or organising related posts into a sequence.
---

# Manage an article series

## Check first

`get_series` — the user may already have a series this belongs in. Creating a
second series on the same theme splits the reader journey and the internal
linking value across both.

`list_my_articles` — existing posts often become parts of the series. Adding
them is better than rewriting them.

## Design

Each part must stand alone (readers arrive mid-series from search) while
building on the last. For each part give a title, a one-paragraph summary, and
what the reader can do afterwards.

4–7 parts is the practical range. Longer series lose readers before the payoff.

## Build

1. `create_series` with the name and description.
2. `add_to_series` for each article, with an explicit position — order is what
   makes it a series rather than a tag.

Add existing articles before drafting new ones, so the gaps are visible.

## Do not

Draft every part up front unless asked. Publish one, see how it performs with
`get_analytics_summary`, then adjust the rest.

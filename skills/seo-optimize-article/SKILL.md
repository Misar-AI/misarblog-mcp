---
name: seo-optimize-article
description: Audit and improve an existing Misar.Blog article for SEO, AEO, and AI-answer-engine citability. Use for "improve SEO", "why isn't this ranking", "meta description", or "optimise for AI search".
---

# Optimise an article

## Read the actual article first

`get_article` by slug. Auditing from the title alone produces generic advice
that applies to any post and helps none.

## Audit

Report an SEO score out of 100 **with the reasoning**, then:

- **Keywords** the piece should rank for but never mentions.
- **Title** — rewritten, under 60 characters, keyword near the front.
- **Meta description** — rewritten, under 155 characters, written to earn the
  click rather than to summarise.
- **Internal links** — use `search_articles` to find *real* published articles
  to link to. Never invent a URL; a broken internal link is worse than none.
- **Structure** — headings that pose the question a reader searched for.

## AI answer engines (AEO/GEO)

Distinct from classic SEO and increasingly where the traffic goes:

- Answer the title's question directly in the first paragraph. Engines quote
  self-contained passages; a piece that builds to its answer never gets cited.
- Keep each section independently comprehensible — a passage lifted out of
  context must still make sense.
- Use concrete specifics (numbers, versions, dates). Vague claims do not get
  quoted.

## Apply

`update_article` — but ask before changing anything. A title change on a
ranking article can lose position, so flag that trade-off explicitly when the
article already gets traffic.

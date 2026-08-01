---
name: publish-blog-post
description: Write, draft, and publish an article on Misar.Blog. Use when the user wants to write a post, publish an article, save a draft, or turn notes into a blog post.
---

# Publish a blog post

## 1. Ground the piece before writing

- `list_my_articles` — match the author's existing voice, and avoid re-covering
  a topic they have already published.
- `search_articles` — check what already exists platform-wide on the subject,
  so the piece has an angle rather than duplicating someone else's.
- `research_topic` — gather angles and sources.

Writing before doing this produces generic output that reads like every other
post on the topic.

## 2. Draft

`create_draft` with `title`, `body_markdown`, and `tags`.

- Markdown with `##` headings and short paragraphs.
- Open with a direct answer to the question the title poses — this is what
  makes a piece quotable by AI answer engines and eligible for featured
  snippets.
- 3–8 tags. More dilutes rather than broadens reach.

**Show the draft and wait for approval before saving.** Never publish in the
same step as writing.

## 3. Title and cover

- `suggest_titles` / `generate_title_seo` for candidates. Keep under 60
  characters so it is not truncated in search results.
- `generate_cover_image` for a cover. Describe the subject concretely; abstract
  prompts produce unusable stock-feeling images.

## 4. Publish

`publish_article` makes it public — get explicit confirmation first. Pass
`schedule_at` to schedule instead.

Use `update_article` for edits after the fact rather than creating a duplicate.

## Do not

- Invent statistics, quotes, or sources. If `research_topic` did not surface
  it, do not assert it.
- Publish without the user seeing the final text.

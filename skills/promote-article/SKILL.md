---
name: promote-article
description: Write platform-specific promotional copy for a Misar.Blog article. Use for "share this post", "social caption", "promote my article", or writing X/LinkedIn/Reddit copy.
---

# Promote an article

## Read it first

`get_article` by slug. Captions written from the title alone are the reason
most promotional copy reads interchangeably.

## Write per platform, not once

Each platform punishes copy written for a different one:

- **X/Twitter** — under 280 characters, hook in the first line, link last. No
  hashtag stuffing.
- **LinkedIn** — longer, first person, line breaks between short paragraphs.
  Lead with the insight, not the announcement.
- **Reddit** — conversational and genuinely non-promotional, or it gets removed
  and the account penalised. Recommend a relevant subreddit and its rules, and
  say clearly when self-promotion is not welcome there.

Always use the article's real URL from the API.

## Amplify

- `get_reputation` — upvotes received, tier and badges show how your audience
  already responds, which helps decide what is worth promoting again.
- `list_saved` — your saved articles, newest first. Use it to find a piece you
  bookmarked to promote or reference.
- `repost_article` — reposts another creator's article to your followers with
  an optional note of up to 280 characters. It needs reputation tier 1, you
  cannot repost your own article, and `remove_repost` undoes it. Confirm the
  note with the user first.
- `list_newsletter_issues` — feature it in the next issue rather than only
  posting socially.
- `get_follow_status` when the user is considering outreach to another creator.

## Do not

Claim engagement numbers, endorsements, or coverage that did not happen.

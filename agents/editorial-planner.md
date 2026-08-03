---
name: editorial-planner
description: Plans a content calendar from existing coverage, analytics and search demand; sets up series.
product: Misar.Blog
mcp_server: @misarblog/mcp
tools: 23
---

# editorial-planner

Plans a content calendar from existing coverage, analytics and search demand; sets up series.

## Requires authentication

Every tool here needs a Misar.Blog API key. If a call comes back asking
you to authenticate, relay the instructions verbatim — they contain the sign-in
URL and the manual key steps. Do not retry the call in a loop, and never invent
a key.

- Browser sign-in: run `login`
- Manual key: https://www.misar.blog/dashboard/settings/api-keys

## Operating rules

1. **Read before you write.** Fetch current state before changing anything;
   never act on an id, URL or metric you have not seen in a tool result.
2. **Confirm anything the outside world sees.** Confirm before any action that sends, publishes, or is visible to other people.
3. **Report failures honestly.** If a tool errors, say what failed and why.
   Never present an unverified result as done.
4. **Stay in scope.** Use Misar.Blog tools for Misar.Blog work; do
   not reach for another product's server to work around a gap.

## Setup

```bash
npx -y @misarblog/mcp@latest
```

Full configuration for every client: https://docs.misar.io/blog/mcp

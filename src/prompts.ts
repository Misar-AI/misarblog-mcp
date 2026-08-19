/**
 * Reusable prompt templates exposed over MCP `prompts/list` / `prompts/get`.
 *
 * These are TEMPLATES: they return instructions for the calling client's model
 * to execute, which is the standard MCP contract. The previous versions on
 * /api/v1/mcp called a server-side `complete()` instead — that burned Misar AI
 * credits on every prompt fetch, produced text the client had no way to steer,
 * and could not work at all on the stdio transport, where no inference
 * credential exists. Every tool name referenced below is a real tool in
 * `src/tools/`.
 */

/** One argument a prompt accepts. */
export interface PromptArgument {
  name: string;
  description: string;
  required: boolean;
}

/** A prompt template: its metadata plus the builder that renders it. */
export interface PromptDefinition {
  name: string;
  description: string;
  arguments: PromptArgument[];
  build: (args: Record<string, string>) => string;
}

/** Every prompt this server exposes. */
export const PROMPTS: PromptDefinition[] = [
  {
    name: "draft_article",
    description: "Write a complete, SEO-optimised article draft and save it to Misar.Blog.",
    arguments: [
      { name: "topic", description: "Topic, title idea, or detailed outline", required: true },
      {
        name: "tone",
        description: "professional | conversational | technical | beginner-friendly",
        required: false,
      },
      { name: "word_count", description: "Target word count (default 800)", required: false },
    ],
    build: (a) =>
      `Write a ${a.word_count || "800"}-word ${a.tone || "conversational"} article about: "${a.topic}".\n\n` +
      "Before writing:\n" +
      "1. Call list_my_articles (status=published, limit=5) and match the voice of those titles.\n" +
      "2. Call research_topic on the subject to gather angles and sources.\n" +
      "3. Call search_articles to check I have not already covered this — say so if I have.\n\n" +
      "Format as Markdown with ## headings and short paragraphs, opening with a meta description.\n\n" +
      "Then show me the draft and WAIT for approval. Only after I approve, call create_draft — " +
      "never publish_article without me explicitly asking to publish.",
  },
  {
    name: "improve_seo",
    description: "Audit an article for SEO/AEO/GEO and apply the improvements.",
    arguments: [
      { name: "article_slug", description: "Slug of the article to analyse", required: true },
    ],
    build: (a) =>
      `Audit the SEO of the article "${a.article_slug}".\n\n` +
      "1. Call get_article to fetch its title, excerpt, tags, and body.\n\n" +
      "Then report:\n" +
      "- An SEO score out of 100 with the reasoning behind it\n" +
      "- Keywords the piece should rank for but does not mention\n" +
      "- A rewritten title (under 60 characters)\n" +
      "- A rewritten meta description (under 155 characters)\n" +
      "- Three internal-link opportunities — use search_articles to find real published " +
      "articles to link to, and do not invent URLs\n" +
      "- What would make it quotable by AI answer engines (direct answers near the top, " +
      "clear headings, self-contained paragraphs)\n\n" +
      "Ask before calling update_article to apply any of it.",
  },
  {
    name: "write_newsletter",
    description: "Draft a newsletter issue from recent published articles.",
    arguments: [
      { name: "issue_title", description: "Newsletter subject line", required: true },
      { name: "num_articles", description: "How many articles to feature (default 3)", required: false },
    ],
    build: (a) =>
      `Draft a newsletter issue titled "${a.issue_title}".\n\n` +
      `1. Call list_my_articles (status=published, limit=${a.num_articles || "3"}) for the articles to feature.\n` +
      "2. Call list_newsletter_issues to see how my past issues are structured, and match that format.\n\n" +
      "For each article write a two-sentence hook that earns the click, using its real URL. " +
      "Open with a short personal intro and close with one call to action. " +
      "If there are fewer published articles than requested, say so rather than inventing any.",
  },
  {
    name: "article_ideas",
    description: "Generate article ideas grounded in what has and has not been covered.",
    arguments: [
      { name: "theme", description: "Theme or niche to generate ideas within", required: false },
      { name: "count", description: "How many ideas (default 10)", required: false },
    ],
    build: (a) =>
      `Generate ${a.count || "10"} article ideas${a.theme ? ` about ${a.theme}` : ""}.\n\n` +
      "1. Call list_my_articles to see what I have already covered — do not repeat it.\n" +
      "2. Call get_analytics_summary to see which existing topics actually drew traffic.\n" +
      `3. Call search_articles${a.theme ? ` for "${a.theme}"` : ""} to see what already exists on the platform.\n\n` +
      "For each idea give: a working title, the search intent it serves, why it fits my audience " +
      "based on the analytics, and a one-line angle that differentiates it from what already ranks. " +
      "Rank them by expected traffic and mark which are quick wins.",
  },
  {
    name: "social_caption",
    description: "Write platform-specific promotional captions for an article.",
    arguments: [
      { name: "article_slug", description: "Slug of the article to promote", required: true },
      { name: "platform", description: "twitter | linkedin | reddit | all (default all)", required: false },
    ],
    build: (a) =>
      `Write promotional captions for the article "${a.article_slug}".\n\n` +
      "1. Call get_article to read the actual content — do not write from the title alone.\n\n" +
      `Produce captions for ${a.platform && a.platform !== "all" ? a.platform : "X/Twitter, LinkedIn, and Reddit"}, ` +
      "each respecting its own norms: X under 280 characters with a hook first; LinkedIn longer, " +
      "first-person, with line breaks; Reddit conversational and non-promotional or it gets removed. " +
      "Include the real article URL. No hashtag stuffing.",
  },
  {
    name: "optimize_headline",
    description: "Generate and rank stronger headline options for an article.",
    arguments: [
      { name: "article_slug", description: "Slug of the article", required: false },
      { name: "topic", description: "Topic, if the article does not exist yet", required: false },
    ],
    build: (a) =>
      (a.article_slug
        ? `Improve the headline of the article "${a.article_slug}". Call get_article first to read it.`
        : `Generate headlines for an article about: ${a.topic || "(topic not supplied — ask me)"}.`) +
      "\n\n" +
      "Call suggest_titles and generate_title_seo for candidates, then present the best 5 in a table " +
      "scoring each on clarity, curiosity, keyword strength, and character count (flag anything over 60). " +
      "Recommend one and explain why in a single sentence.",
  },
  {
    name: "series_plan",
    description: "Plan a multi-part article series and set it up on Misar.Blog.",
    arguments: [
      { name: "topic", description: "Subject of the series", required: true },
      { name: "parts", description: "How many parts (default 5)", required: false },
    ],
    build: (a) =>
      `Plan a ${a.parts || "5"}-part article series on: ${a.topic}.\n\n` +
      "1. Call get_series to check I do not already have a series covering this.\n" +
      "2. Call list_my_articles — existing posts may become parts of it rather than being rewritten.\n\n" +
      "Design the arc so each part stands alone but builds on the last. For each part give a title, " +
      "a one-paragraph summary, and what the reader can do afterwards.\n\n" +
      "After I approve the plan, call create_series, then add_to_series for any existing article " +
      "that fits. Do not draft the new parts until I ask.",
  },
  {
    name: "engagement_report",
    description: "Summarise blog performance and recommend what to do next.",
    arguments: [
      { name: "days", description: "Look-back window in days (default 30)", required: false },
    ],
    build: (a) =>
      `Report on my blog performance over the last ${a.days || "30"} days.\n\n` +
      "Gather: get_analytics_summary, list_my_articles (status=published), " +
      "list_newsletter_subscribers, and get_reactions on the top articles.\n\n" +
      "Report views, revenue, subscriber growth, and the best and worst performing article each " +
      "with a one-line reason. Close with the single highest-impact action for next month. " +
      "Keep it under 400 words, and state plainly if any figure was unavailable rather than estimating.",
  },
];

const BY_NAME = new Map(PROMPTS.map((p) => [p.name, p]));

/** One prompt as advertised by `prompts/list`. */
export interface PromptSummary {
  /** Prompt id to pass to {@link getPrompt}. */
  name: string;
  /** What the prompt is for. */
  description: string;
  /** Arguments it accepts, and which are required. */
  arguments: Array<{ name: string; description: string; required?: boolean }>;
}

/** A rendered prompt, as returned by `prompts/get`. */
export interface RenderedPrompt {
  /** What the prompt is for. */
  description: string;
  /** The messages to seed the conversation with. */
  messages: Array<{ role: "user"; content: { type: "text"; text: string } }>;
}

/** Every prompt this server exposes, as `prompts/list` returns them. */
export function listPrompts(): PromptSummary[] {
  return PROMPTS.map(({ name, description, arguments: args }) => ({
    name,
    description,
    arguments: args,
  }));
}

/** Render one prompt by name, or null when no such prompt exists. */
export function getPrompt(name: string, args: Record<string, string> = {}): RenderedPrompt | null {
  const prompt = BY_NAME.get(name);
  if (!prompt) return null;
  return {
    description: prompt.description,
    messages: [
      { role: "user" as const, content: { type: "text" as const, text: prompt.build(args) } },
    ],
  };
}

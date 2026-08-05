# thai-macros-blog — design spec

## Context

Bam wants a food blog that can eventually become a physical/digital cookbook.
The niche: Thai recipes with visible macros (calories/protein/carbs/fat) on
every recipe — a mix of "Thai food blog" and "macro-conscious fitness
cookbook," differentiated from both categories individually (most Thai
cookbooks skip macros; most macro-tracking cookbooks aren't Thai-focused).
It's a natural extension of AI Auang (Bam's Thai fitness LINE bot), which
already estimates recipe macros via Claude (`estimateFoodMacros`,
`estimateRecipeMacros` in that project's `src/services/claude.js`), but ships
as a fully separate, standalone product — no live connection to AI Auang's
backend, LINE account, or user data.

A closely related idea — importing a user's AI Auang food logs to generate
Netflix/Amazon-style recipe recommendations — came up during this
brainstorm and was deliberately **descoped** to a future, separate spec (see
Non-Goals). It would require its own data-flow, matching approach, and
almost certainly a blog-side user-account model; designing it blind
alongside the blog itself would have doubled this spec's surface before the
blog's own data model even existed to attach recommendations to.

## Goals

- Bilingual (Thai + English) recipe blog, Thai cuisine, every recipe shows
  full macros.
- Simple recipe-card format only: photo, macros, ingredients, steps. No
  long-form blog-post narrative/story content.
- Real filtering — by macro range, diet tags, meal type, ingredient/text
  search — not just static category browsing.
- Recipes drafted by Claude, reviewed/edited by Bam before publishing.
- As simple and cheap to run as possible; no backend server to maintain for
  v1.
- Designed so a future recommendation feature (Non-Goals) can attach later
  without a rebuild.

## Non-Goals (this spec)

- **AI Auang log import + recommendation engine.** Explicitly deferred to a
  separate future spec, once this blog (and its recipe data) exists to
  recommend from. Current leaning for that future spec: reuse AI Auang's
  existing dashboard-token pattern (a scoped, expiring export link) rather
  than a standing connection between the two systems' backends — not
  decided, revisit then.
- **User accounts.** No login, no saved favorites, no personalization in v1
  — filtering and browsing are fully anonymous/stateless.
- **Long-form blog-post content.** No story-before-recipe format; every
  recipe is a card (photo/macros/ingredients/steps), not an essay.
- **Live connection to AI Auang.** This site never calls AI Auang's backend
  or database. Fully standalone.

## Architecture

**Astro**, static output, deployed to a static host (Vercel/Netlify/
Cloudflare Pages — any works, pick at deploy time).

**Content model:** one file per recipe (Astro Content Collection, e.g.
`src/content/recipes/pad-thai.md`), frontmatter holds **both languages
inline** in the same file — `title_th`/`title_en`, `ingredients` (array of
`{ name_th, name_en, amount }`), `steps` (array of `{ th, en }`),
`calories`/`protein`/`carbs`/`fat` (numbers), `tags` (diet, meal-type,
region strings), `photo` (path). One file to edit per recipe, no
separate-file-per-language sync problem.

**Schema validation:** a Zod schema on the Content Collection enforces the
shape above (macros present and numeric, ingredients/steps non-empty,
required tag fields) — a malformed recipe file **fails the Astro build**,
so bad content can never reach production. This is the main content-quality
gate; no separate moderation/review tooling needed.

**Filtering:** client-side only. The build step also emits a JSON index of
recipe metadata (everything needed to filter/display cards, not full
step-by-step content). A small JS island on the browse page filters that
in-memory array as the user adjusts macro-range/tag/search controls — no
network round-trip per filter change, no backend.

**Recipe creation pipeline:** a standalone Node CLI script (not part of the
deployed site) that takes a dish idea, calls Claude to draft ingredients/
steps/macros in both languages (same shape as AI Auang's
`estimateRecipeMacros`), validates the draft against the same Zod schema,
and writes it as a new content file. Bam reviews/edits the file by hand and
commits it — Claude drafts, Bam curates.

## Components

- **Browse/grid page** — recipe cards (photo, title, macro-summary badge) in
  a grid; filter bar/sidebar above/beside (macro-range controls, diet-tag
  chips, meal-type chips, text search).
- **Recipe detail page** — hero photo, macro summary, ingredient list,
  numbered steps. Language toggle persists across navigation.
- **Tag/category landing pages** (e.g. `/high-protein`, `/thai-curries`) —
  same grid component, pre-applied filter, each its own indexable static
  route (SEO value beyond what client-side-only filtering would give).
- **Language switcher** — global, URL-prefix routing (`/en/recipes/...`,
  `/th/recipes/...`), both rendered from the same source file's `_th`/`_en`
  fields. URL-prefix over a cookie because each language version becomes its
  own crawlable, indexable URL — meaningful for SEO on a content site like
  this, and Astro's i18n routing supports it natively.
- **Draft script** — dev-only CLI tool; ships in the repo but not in the
  deployed site output.

## Data flow

1. Bam runs the draft script with a dish idea → Claude drafts ingredients/
   steps/macros in TH+EN → script validates the draft against the Zod
   schema → writes a new file under `src/content/recipes/`.
2. Bam reviews/edits the file by hand, commits to git.
3. Build: Astro validates every recipe file against the schema (hard build
   failure on any invalid file), renders static pages for browse/detail/tag
   routes, emits the JSON search index.
4. Deploy — static output goes to the host.
5. A visitor loads the browse page, the JSON index loads once, and
   adjusting filters re-filters that in-memory array client-side. Clicking a
   card navigates to an already-static detail page.

No step in this flow calls AI Auang or any live backend.

## Error handling

- **Build-time is the primary guardrail** — malformed recipe frontmatter
  (missing/wrong-type macro, empty ingredient list, etc.) fails the build
  outright. Bad content cannot reach production.
- **Draft script** wraps its Claude call in the same retry pattern AI Auang
  already uses (`withRetry`) and validates the AI's output against the
  schema *before* writing the file — Bam only ever reviews structurally
  valid drafts, even when the content itself still needs editing.
- **Runtime** is minimal by design (static + client-side only). The one real
  case to handle: filters narrowing to zero results needs a clear empty
  state ("no recipes match, try loosening filters"), not a blank grid.

## Testing

- Schema validation on every build is effectively a full content-integrity
  test across all recipes — no separate test suite needed to catch
  malformed data.
- A small script-level test asserts the draft script produces schema-valid
  output for a handful of sample dish prompts — catches prompt drift if the
  Claude prompt is ever tweaked.
- Manual QA before each deploy: filter edge cases (zero-result state,
  extreme macro ranges), language toggle on a couple of recipes, mobile
  layout on the grid.

## Project location

New sibling repo at `C:\Users\Lenovo\thai-macros-blog`, separate from
FitPang-Bot — own git history, own deploy pipeline, no shared
config/secrets with the bot's repo. Chosen because the two products don't
call each other (per Non-Goals) and keeping them separate avoids any risk
of the bot's private repo internals ending up near a public-facing site's
repo.

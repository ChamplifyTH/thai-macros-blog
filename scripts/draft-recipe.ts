// scripts/draft-recipe.ts
//
// Standalone dev CLI (not part of the deployed site). Drafts a recipe via Claude and
// writes it out as a content file for Bam to review/edit before committing. The draft
// is always validated against the exact same `recipeSchema` the site's build enforces
// (src/content/recipeSchema.ts) before it's ever written to disk — Bam only ever sees
// structurally-valid drafts.
//
// API-shape note (see draft-recipe.test.ts for the full writeup): the plan for this
// script originally called for `client.messages.parse()` with `zodOutputFormat`. That
// SDK helper is hard-wired to `zod/v4` internals and throws at runtime when given this
// repo's classic-`zod` (v3) `recipeSchema`. So this script uses plain
// `client.messages.create()`, asks Claude for a single JSON object in the reply, and
// validates the result with `recipeSchema.safeParse()` directly — the real schema, no
// converted copy of it.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { stringify } from "yaml";
import { recipeSchema, type Recipe } from "../src/content/recipeSchema.js";

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  waitMs: (attempt: number) => number = (attempt) => 1000 * 2 ** attempt
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        console.warn(`Attempt ${attempt}/${maxAttempts} failed, retrying...`);
        await new Promise((resolve) => setTimeout(resolve, waitMs(attempt)));
      }
    }
  }
  throw lastError;
}

/**
 * Strips a ```json ... ``` (or bare ``` ... ```) fence around a JSON payload, if
 * present. Claude sometimes wraps structured output in a markdown code fence even when
 * asked not to; this makes JSON.parse robust to that without weakening validation —
 * the extracted text still has to pass recipeSchema.safeParse below.
 */
function extractJsonText(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return (fenced ? fenced[1] : text).trim();
}

export async function draftRecipe(
  client: Anthropic,
  dishIdea: string
): Promise<Recipe | null> {
  const response = await withRetry(() =>
    client.messages.create({
      // claude-opus-5 is the current Opus model in this environment as of this
      // writing; the plan's "claude-opus-4-7" predates it. A wrong/retired model
      // id fails every retry attempt identically (non-transient), so withRetry
      // just burns its backoff window before giving up — keep this pinned to
      // the current model rather than a stale one.
      model: "claude-opus-5",
      max_tokens: 16000,
      messages: [
        {
          role: "user",
          content: `Draft a Thai recipe for "${dishIdea}". Provide the dish title, a full ingredient list with amounts, numbered cooking steps, and estimated macros (calories, protein, carbs, fat in grams) for one serving — all in BOTH Thai and English. Tag it with relevant diet tags (e.g. high-protein, low-carb, vegetarian), meal-type tags (breakfast, lunch, dinner, snack), and region tags (e.g. central-thai, northern-thai, isaan, southern-thai). Use a placeholder photo path in the form "/images/<english-slug>.jpg" for the photo field.

Reply with ONLY a single JSON object with this exact shape, no markdown fences, no commentary:
{
  "title_th": string,
  "title_en": string,
  "photo": string,
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "ingredients": [{ "name_th": string, "name_en": string, "amount": string }],
  "steps": [{ "th": string, "en": string }],
  "dietTags": string[],
  "mealTypeTags": string[],
  "regionTags": string[]
}`,
        },
      ],
    })
  );

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  if (!textBlock) return null;

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(extractJsonText(textBlock.text));
  } catch {
    return null;
  }

  const result = recipeSchema.safeParse(parsedJson);
  return result.success ? result.data : null;
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function writeRecipeFile(recipe: Recipe, baseDir: string): string {
  if (!existsSync(baseDir)) mkdirSync(baseDir, { recursive: true });
  const slug = slugify(recipe.title_en);
  const filePath = join(baseDir, `${slug}.md`);
  const frontmatter = stringify(recipe);
  writeFileSync(filePath, `---\n${frontmatter}---\n`);
  return filePath;
}

async function main() {
  const dishIdea = process.argv[2];
  if (!dishIdea) {
    console.error('Usage: npm run draft -- "<dish idea>"');
    process.exit(1);
  }
  const client = new Anthropic();
  console.log(`Drafting recipe for "${dishIdea}"...`);
  const recipe = await draftRecipe(client, dishIdea);
  if (!recipe) {
    console.error(
      "Claude did not return a schema-valid recipe. Try again or rephrase the dish idea."
    );
    process.exit(1);
  }
  const outDir = join(process.cwd(), "src", "content", "recipes");
  const filePath = writeRecipeFile(recipe, outDir);
  console.log(`Draft written to ${filePath} — review and edit before committing.`);
}

// Only run when executed directly (not when imported by the test file). Compares
// resolved native paths (via fileURLToPath) rather than string-building a file:// URL,
// so this works correctly on Windows (backslashes, drive letters) as well as POSIX.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}

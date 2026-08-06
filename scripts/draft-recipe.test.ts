// scripts/draft-recipe.test.ts
import { describe, it, expect, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import { withRetry, draftRecipe, slugify, writeRecipeFile } from "./draft-recipe";
import type { Recipe } from "../src/content/recipeSchema";

const validRecipe: Recipe = {
  title_th: "ผัดไทย",
  title_en: "Pad Thai",
  photo: "/images/pad-thai.jpg",
  calories: 486,
  protein: 22,
  carbs: 58,
  fat: 18,
  ingredients: [{ name_th: "เส้นจันท์", name_en: "Rice noodles", amount: "200g" }],
  steps: [{ th: "แช่เส้น", en: "Soak noodles" }],
  dietTags: ["high-protein"],
  mealTypeTags: ["lunch"],
  regionTags: ["central-thai"],
};

describe("withRetry", () => {
  it("returns the result on first success without retrying", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, 3, () => 0);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries after a failure and returns the eventual success", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValueOnce("ok");
    const result = await withRetry(fn, 3, () => 0);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws the last error after exhausting all attempts", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("persistent"));
    await expect(withRetry(fn, 3, () => 0)).rejects.toThrow("persistent");
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

// NOTE on draftRecipe's client call shape:
//
// The original plan called for `client.messages.parse({ output_config: { format:
// zodOutputFormat(recipeSchema) } })`, reading `.parsed_output`. That relies on
// @anthropic-ai/sdk's `zodOutputFormat` helper, which (as of 0.115.0) is hard-wired to
// `zod/v4` internals (`helpers/zod.js` calls `require("zod/v4")` and then
// `z.toJSONSchema(zodObject, ...)`). `recipeSchema` in this repo is built with the
// classic `zod` (v3, "^3.24.1") import used by Astro's content collections — a
// different object shape (`_def` vs `.def`). Verified experimentally: calling
// `zodOutputFormat(recipeSchema)` throws `Cannot read properties of undefined
// (reading 'def')` at runtime, not just a TS type error. So draftRecipe instead calls
// the plain `client.messages.create(...)`, asks Claude to reply with a single JSON
// object, and validates the parsed JSON with the real `recipeSchema.safeParse()` —
// the exact same schema object the site's build enforces, with no converted/duplicated
// copy of it. This preserves the task's core guarantee (Bam only ever sees
// schema-valid drafts) without depending on an SDK code path that's broken for a v3
// zod schema at this SDK version.
describe("draftRecipe", () => {
  it("returns the parsed recipe when Claude's output is schema-valid JSON", async () => {
    const fakeClient = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: JSON.stringify(validRecipe) }],
        }),
      },
    } as unknown as Anthropic;
    const result = await draftRecipe(fakeClient, "pad thai");
    expect(result).toEqual(validRecipe);
  });

  it("unwraps a markdown-fenced JSON response before validating", async () => {
    const fakeClient = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [
            { type: "text", text: "```json\n" + JSON.stringify(validRecipe) + "\n```" },
          ],
        }),
      },
    } as unknown as Anthropic;
    const result = await draftRecipe(fakeClient, "pad thai");
    expect(result).toEqual(validRecipe);
  });

  it("returns null when Claude's output fails schema validation", async () => {
    const fakeClient = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: JSON.stringify({ title_th: "ก๋วยเตี๋ยว" }) }],
        }),
      },
    } as unknown as Anthropic;
    const result = await draftRecipe(fakeClient, "something ambiguous");
    expect(result).toBeNull();
  });

  it("returns null when Claude's response isn't valid JSON", async () => {
    const fakeClient = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: "sorry, I can't help with that" }],
        }),
      },
    } as unknown as Anthropic;
    const result = await draftRecipe(fakeClient, "gibberish");
    expect(result).toBeNull();
  });

  it("returns null when the response has no text content block", async () => {
    const fakeClient = {
      messages: {
        create: vi.fn().mockResolvedValue({ content: [] }),
      },
    } as unknown as Anthropic;
    const result = await draftRecipe(fakeClient, "pad thai");
    expect(result).toBeNull();
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates a title", () => {
    expect(slugify("Pad Thai")).toBe("pad-thai");
  });

  it("strips characters that aren't alphanumeric", () => {
    expect(slugify("Tom Yum Goong!")).toBe("tom-yum-goong");
  });
});

describe("writeRecipeFile", () => {
  it("writes YAML frontmatter that contains the recipe's fields", () => {
    const dir = mkdtempSync(join(tmpdir(), "recipe-test-"));
    try {
      const filePath = writeRecipeFile(validRecipe, dir);
      const content = readFileSync(filePath, "utf8");
      expect(content.startsWith("---\n")).toBe(true);
      expect(content).toContain("title_en: Pad Thai");
      expect(content).toContain("calories: 486");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("derives the filename from the English title", () => {
    const dir = mkdtempSync(join(tmpdir(), "recipe-test-"));
    try {
      const filePath = writeRecipeFile(validRecipe, dir);
      expect(filePath.endsWith("pad-thai.md")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

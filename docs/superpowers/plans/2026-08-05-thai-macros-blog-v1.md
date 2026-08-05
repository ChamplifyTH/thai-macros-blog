# thai-macros-blog v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone, bilingual (Thai/English) Thai-recipe site where every recipe shows macros (calories/protein/carbs/fat), browsable via a real client-side filter (macro range, diet tags, meal type, search), with recipes drafted by Claude and hand-curated before publishing.

**Architecture:** Astro static site (no backend, no database). Each recipe is one Markdown file with bilingual frontmatter, validated at build time by a shared Zod schema (also reused by a standalone Node recipe-drafting script). Filtering runs entirely client-side over a build-time-embedded JSON index — no network round-trip per filter change.

**Tech Stack:** Astro 5 (Content Layer API), TypeScript, Zod, Vitest, `@anthropic-ai/sdk` (draft script only, not part of the deployed site), `tsx` (run the draft script), `yaml` (frontmatter serialization in the draft script), `@fontsource/*` (self-hosted Noto Serif Thai, Anuphan, JetBrains Mono).

**Design:** Tokens and type choices reviewed and revised from AI Auang's own dashboard palette — see `docs/superpowers/design-brief-prompt.md` for the brief and the follow-up visual review it produced. The "Log this meal" button and calorie-calculator/meal-plan nav items from that review ship as non-functional visual placeholders in this plan; wiring them to AI Auang is explicitly out of scope (see spec Non-Goals).

Spec: `docs/superpowers/specs/2026-08-05-thai-macros-blog-design.md`

---

## File Structure

```
thai-macros-blog/
├── package.json
├── astro.config.mjs
├── tsconfig.json
├── vitest.config.ts
├── .env.example
├── .gitignore
├── src/
│   ├── content.config.ts          # Content Collection definition (uses recipeSchema)
│   ├── content/
│   │   ├── recipeSchema.ts        # Shared Zod schema — imported by content.config.ts AND scripts/draft-recipe.ts
│   │   └── recipes/
│   │       ├── pad-thai.md
│   │       └── tom-yum-goong.md
│   ├── lib/
│   │   ├── buildIndexEntry.ts     # Pure fn: collection entry -> lightweight index record
│   │   ├── buildIndexEntry.test.ts
│   │   ├── filterRecipes.ts       # Pure fn: filter index records by macro/tag/search criteria
│   │   ├── filterRecipes.test.ts
│   │   ├── sortRecipes.ts         # Pure fn: sort index records by protein/calories
│   │   └── sortRecipes.test.ts
│   ├── styles/
│   │   └── tokens.css             # Design tokens (color/type/spacing) + base element resets
│   ├── components/
│   │   ├── Layout.astro           # <html> shell, nav (+ inert calorie-calc/meal-plan placeholders), language switcher
│   │   └── RecipeCard.astro       # Server-rendered card (also the shape client JS re-renders)
│   └── pages/
│       ├── index.astro            # Redirects to /en/
│       └── [lang]/
│           ├── index.astro        # Browse/grid page + embedded JSON index + filter script
│           ├── recipes/
│           │   └── [slug].astro   # Recipe detail page
│           └── tags/
│               └── [tag].astro    # Tag landing page
├── scripts/
│   └── draft-recipe.ts            # CLI: dish idea -> Claude draft -> schema-validated file
├── scripts/draft-recipe.test.ts
└── public/
    └── images/                    # Recipe photos (not created by this plan — Bam adds real photos later)
```

---

### Task 1: Scaffold the Astro + TypeScript + Vitest project

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `src/pages/index.astro` (placeholder, replaced in Task 12)

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "thai-macros-blog",
  "type": "module",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "vitest run",
    "draft": "tsx --env-file=.env scripts/draft-recipe.ts"
  },
  "dependencies": {
    "astro": "^5.1.0",
    "zod": "^3.24.1",
    "@anthropic-ai/sdk": "^0.68.0",
    "yaml": "^2.6.1"
  },
  "devDependencies": {
    "vitest": "^2.1.8",
    "typescript": "^5.7.2",
    "tsx": "^4.19.2"
  }
}
```

- [ ] **Step 2: Write `astro.config.mjs`**

```js
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://example.com", // update once a real domain is chosen
});
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 4: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 5: Write `.gitignore`**

```
node_modules/
dist/
.astro/
.env
```

- [ ] **Step 6: Write `.env.example`**

```
ANTHROPIC_API_KEY=
```

- [ ] **Step 7: Write a placeholder `src/pages/index.astro`** (replaced for real in Task 12 — Astro requires at least one page to run `dev`/`build` successfully at every intermediate step of this plan)

```astro
---
---
<p>placeholder</p>
```

- [ ] **Step 8: Install dependencies**

Run: `cd C:\Users\Lenovo\thai-macros-blog && npm install`
Expected: installs cleanly, `node_modules/` created, no peer-dependency errors.

- [ ] **Step 9: Verify the dev server boots**

Run: `npm run build`
Expected: `astro build` completes successfully, produces a `dist/` folder with the placeholder page.

- [ ] **Step 10: Commit**

```bash
git add package.json astro.config.mjs tsconfig.json vitest.config.ts .gitignore .env.example src/pages/index.astro
git commit -m "chore: scaffold Astro + TypeScript + Vitest project"
```

---

### Task 2: Shared recipe Zod schema

**Files:**
- Create: `src/content/recipeSchema.ts`
- Test: `src/content/recipeSchema.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/content/recipeSchema.test.ts
import { describe, it, expect } from "vitest";
import { recipeSchema } from "./recipeSchema";

const validRecipe = {
  title_th: "ผัดไทย",
  title_en: "Pad Thai",
  photo: "/images/pad-thai.jpg",
  calories: 486,
  protein: 22,
  carbs: 58,
  fat: 18,
  ingredients: [
    { name_th: "เส้นจันท์", name_en: "Rice noodles", amount: "200g" },
  ],
  steps: [{ th: "แช่เส้นในน้ำอุ่น", en: "Soak noodles in warm water" }],
  dietTags: ["high-protein"],
  mealTypeTags: ["lunch"],
  regionTags: ["central-thai"],
};

describe("recipeSchema", () => {
  it("accepts a fully valid recipe", () => {
    const result = recipeSchema.safeParse(validRecipe);
    expect(result.success).toBe(true);
  });

  it("rejects a recipe missing calories", () => {
    const { calories, ...withoutCalories } = validRecipe;
    const result = recipeSchema.safeParse(withoutCalories);
    expect(result.success).toBe(false);
  });

  it("rejects a recipe with a negative macro value", () => {
    const result = recipeSchema.safeParse({ ...validRecipe, protein: -5 });
    expect(result.success).toBe(false);
  });

  it("rejects a recipe with an empty ingredients list", () => {
    const result = recipeSchema.safeParse({ ...validRecipe, ingredients: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a recipe with an empty steps list", () => {
    const result = recipeSchema.safeParse({ ...validRecipe, steps: [] });
    expect(result.success).toBe(false);
  });

  it("defaults tag arrays to empty when omitted", () => {
    const { dietTags, mealTypeTags, regionTags, ...withoutTags } = validRecipe;
    const result = recipeSchema.safeParse(withoutTags);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dietTags).toEqual([]);
      expect(result.data.mealTypeTags).toEqual([]);
      expect(result.data.regionTags).toEqual([]);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/content/recipeSchema.test.ts`
Expected: FAIL — `Cannot find module './recipeSchema'`

- [ ] **Step 3: Write the schema**

```ts
// src/content/recipeSchema.ts
import { z } from "zod";

export const ingredientSchema = z.object({
  name_th: z.string().min(1),
  name_en: z.string().min(1),
  amount: z.string().min(1),
});

export const stepSchema = z.object({
  th: z.string().min(1),
  en: z.string().min(1),
});

export const recipeSchema = z.object({
  title_th: z.string().min(1),
  title_en: z.string().min(1),
  photo: z.string().min(1),
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  ingredients: z.array(ingredientSchema).min(1),
  steps: z.array(stepSchema).min(1),
  dietTags: z.array(z.string()).default([]),
  mealTypeTags: z.array(z.string()).default([]),
  regionTags: z.array(z.string()).default([]),
});

export type Recipe = z.infer<typeof recipeSchema>;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/content/recipeSchema.test.ts`
Expected: PASS — 6 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/content/recipeSchema.ts src/content/recipeSchema.test.ts
git commit -m "feat: add shared recipe Zod schema with tests"
```

---

### Task 3: Astro Content Collection config

**Files:**
- Create: `src/content.config.ts`

- [ ] **Step 1: Write the config**

```ts
// src/content.config.ts
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { recipeSchema } from "./content/recipeSchema";

const recipes = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/recipes" }),
  schema: recipeSchema,
});

export const collections = { recipes };
```

- [ ] **Step 2: Verify the build still succeeds with zero recipes**

Run: `npm run build`
Expected: succeeds — an empty `src/content/recipes/` directory is valid (no recipe files yet, added in Task 4).

- [ ] **Step 3: Commit**

```bash
git add src/content.config.ts
git commit -m "feat: define recipes Content Collection using the shared schema"
```

---

### Task 4: Sample recipe content files

**Files:**
- Create: `src/content/recipes/pad-thai.md`
- Create: `src/content/recipes/tom-yum-goong.md`

- [ ] **Step 1: Write `pad-thai.md`**

```markdown
---
title_th: "ผัดไทย"
title_en: "Pad Thai"
photo: "/images/pad-thai.jpg"
calories: 486
protein: 22
carbs: 58
fat: 18
ingredients:
  - name_th: "เส้นจันท์"
    name_en: "Rice noodles"
    amount: "200g"
  - name_th: "กุ้ง"
    name_en: "Shrimp"
    amount: "150g"
  - name_th: "ไข่"
    name_en: "Egg"
    amount: "1 egg"
  - name_th: "ถั่วงอก"
    name_en: "Bean sprouts"
    amount: "1 cup"
  - name_th: "น้ำมะขามเปียก"
    name_en: "Tamarind paste"
    amount: "2 tbsp"
dietTags:
  - "high-protein"
mealTypeTags:
  - "lunch"
  - "dinner"
regionTags:
  - "central-thai"
steps:
  - th: "แช่เส้นจันท์ในน้ำอุ่น 20 นาที"
    en: "Soak rice noodles in warm water for 20 minutes"
  - th: "ผัดกุ้งกับกระเทียมจนสุก"
    en: "Stir-fry shrimp with garlic until cooked"
  - th: "ใส่เส้นและซอสผัดไทย ผัดให้เข้ากัน"
    en: "Add noodles and pad thai sauce, stir-fry until combined"
  - th: "ดันเส้นไปด้านหนึ่ง ตอกไข่ลงไปคนให้สุก"
    en: "Push noodles aside, crack egg into the pan and scramble"
  - th: "ใส่ถั่วงอก ผัดรวมกันอีก 1 นาที เสิร์ฟร้อน"
    en: "Add bean sprouts, toss for another minute, serve hot"
---
```

- [ ] **Step 2: Write `tom-yum-goong.md`**

```markdown
---
title_th: "ต้มยำกุ้ง"
title_en: "Tom Yum Goong"
photo: "/images/tom-yum-goong.jpg"
calories: 310
protein: 28
carbs: 14
fat: 15
ingredients:
  - name_th: "กุ้ง"
    name_en: "Shrimp"
    amount: "250g"
  - name_th: "ตะไคร้"
    name_en: "Lemongrass"
    amount: "2 stalks"
  - name_th: "ใบมะกรูด"
    name_en: "Kaffir lime leaves"
    amount: "4 leaves"
  - name_th: "พริกขี้หนู"
    name_en: "Thai chilies"
    amount: "5 chilies"
  - name_th: "น้ำพริกเผา"
    name_en: "Roasted chili paste"
    amount: "2 tbsp"
dietTags:
  - "high-protein"
  - "low-carb"
mealTypeTags:
  - "lunch"
  - "dinner"
regionTags:
  - "central-thai"
steps:
  - th: "ต้มน้ำซุปกับตะไคร้และใบมะกรูดจนหอม"
    en: "Boil stock with lemongrass and kaffir lime leaves until fragrant"
  - th: "ใส่กุ้งและพริกขี้หนู ต้มจนกุ้งสุก"
    en: "Add shrimp and chilies, boil until shrimp are cooked"
  - th: "ปรุงรสด้วยน้ำพริกเผา น้ำปลา และน้ำมะนาว"
    en: "Season with roasted chili paste, fish sauce, and lime juice"
  - th: "ตักเสิร์ฟร้อนๆ"
    en: "Serve hot"
---
```

- [ ] **Step 3: Verify the build succeeds and both recipes validate**

Run: `npm run build`
Expected: succeeds, no schema errors. If either file has a schema violation, the build fails with a clear Zod error pointing at the offending file — confirms the build-time guardrail from the spec's Error Handling section actually works.

- [ ] **Step 4: Commit**

```bash
git add src/content/recipes/pad-thai.md src/content/recipes/tom-yum-goong.md
git commit -m "feat: add two sample recipes for dev/testing"
```

---

### Task 5: `buildIndexEntry` — collection entry to lightweight index record

**Files:**
- Create: `src/lib/buildIndexEntry.ts`
- Test: `src/lib/buildIndexEntry.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/buildIndexEntry.test.ts
import { describe, it, expect } from "vitest";
import { buildIndexEntry } from "./buildIndexEntry";
import type { Recipe } from "../content/recipeSchema";

const recipe: Recipe = {
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

describe("buildIndexEntry", () => {
  it("extracts id and display/filter fields, excluding ingredients and steps", () => {
    const entry = buildIndexEntry("pad-thai", recipe);
    expect(entry).toEqual({
      id: "pad-thai",
      title_th: "ผัดไทย",
      title_en: "Pad Thai",
      photo: "/images/pad-thai.jpg",
      calories: 486,
      protein: 22,
      carbs: 58,
      fat: 18,
      dietTags: ["high-protein"],
      mealTypeTags: ["lunch"],
      regionTags: ["central-thai"],
    });
    expect(entry).not.toHaveProperty("ingredients");
    expect(entry).not.toHaveProperty("steps");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/buildIndexEntry.test.ts`
Expected: FAIL — `Cannot find module './buildIndexEntry'`

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/buildIndexEntry.ts
import type { Recipe } from "../content/recipeSchema";

export interface RecipeIndexEntry {
  id: string;
  title_th: string;
  title_en: string;
  photo: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  dietTags: string[];
  mealTypeTags: string[];
  regionTags: string[];
}

export function buildIndexEntry(id: string, data: Recipe): RecipeIndexEntry {
  return {
    id,
    title_th: data.title_th,
    title_en: data.title_en,
    photo: data.photo,
    calories: data.calories,
    protein: data.protein,
    carbs: data.carbs,
    fat: data.fat,
    dietTags: data.dietTags,
    mealTypeTags: data.mealTypeTags,
    regionTags: data.regionTags,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/buildIndexEntry.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/buildIndexEntry.ts src/lib/buildIndexEntry.test.ts
git commit -m "feat: add buildIndexEntry with tests"
```

---

### Task 6: `filterRecipes` — client-side filter logic

**Files:**
- Create: `src/lib/filterRecipes.ts`
- Test: `src/lib/filterRecipes.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/filterRecipes.test.ts
import { describe, it, expect } from "vitest";
import { filterRecipes } from "./filterRecipes";
import type { RecipeIndexEntry } from "./buildIndexEntry";

const padThai: RecipeIndexEntry = {
  id: "pad-thai",
  title_th: "ผัดไทย",
  title_en: "Pad Thai",
  photo: "/images/pad-thai.jpg",
  calories: 486,
  protein: 22,
  carbs: 58,
  fat: 18,
  dietTags: ["high-protein"],
  mealTypeTags: ["lunch", "dinner"],
  regionTags: ["central-thai"],
};

const tomYum: RecipeIndexEntry = {
  id: "tom-yum-goong",
  title_th: "ต้มยำกุ้ง",
  title_en: "Tom Yum Goong",
  photo: "/images/tom-yum-goong.jpg",
  calories: 310,
  protein: 28,
  carbs: 14,
  fat: 15,
  dietTags: ["high-protein", "low-carb"],
  mealTypeTags: ["lunch", "dinner"],
  regionTags: ["central-thai"],
};

const all = [padThai, tomYum];

describe("filterRecipes", () => {
  it("returns everything when no filters are set", () => {
    expect(filterRecipes(all, { lang: "en" })).toEqual(all);
  });

  it("filters by text search against the title in the given language", () => {
    expect(filterRecipes(all, { lang: "en", search: "pad" })).toEqual([padThai]);
    expect(filterRecipes(all, { lang: "th", search: "ต้มยำ" })).toEqual([tomYum]);
  });

  it("filters by minimum calories", () => {
    expect(filterRecipes(all, { lang: "en", minCalories: 400 })).toEqual([padThai]);
  });

  it("filters by maximum calories", () => {
    expect(filterRecipes(all, { lang: "en", maxCalories: 350 })).toEqual([tomYum]);
  });

  it("filters by minimum protein", () => {
    expect(filterRecipes(all, { lang: "en", minProtein: 25 })).toEqual([tomYum]);
  });

  it("filters by diet tags — recipe must match ALL requested tags", () => {
    expect(filterRecipes(all, { lang: "en", dietTags: ["low-carb"] })).toEqual([tomYum]);
    expect(filterRecipes(all, { lang: "en", dietTags: ["high-protein", "low-carb"] })).toEqual([tomYum]);
  });

  it("filters by meal type tags — recipe must match ANY requested tag", () => {
    expect(filterRecipes(all, { lang: "en", mealTypeTags: ["lunch"] })).toEqual(all);
  });

  it("combines multiple filters", () => {
    expect(
      filterRecipes(all, { lang: "en", minProtein: 25, dietTags: ["low-carb"] })
    ).toEqual([tomYum]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterRecipes(all, { lang: "en", minCalories: 10000 })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/filterRecipes.test.ts`
Expected: FAIL — `Cannot find module './filterRecipes'`

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/filterRecipes.ts
import type { RecipeIndexEntry } from "./buildIndexEntry";

export interface RecipeFilters {
  lang: "th" | "en";
  search?: string;
  minCalories?: number;
  maxCalories?: number;
  minProtein?: number;
  dietTags?: string[];
  mealTypeTags?: string[];
}

export function filterRecipes(
  recipes: RecipeIndexEntry[],
  filters: RecipeFilters
): RecipeIndexEntry[] {
  return recipes.filter((recipe) => {
    if (filters.search) {
      const title = filters.lang === "th" ? recipe.title_th : recipe.title_en;
      if (!title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    }
    if (filters.minCalories !== undefined && recipe.calories < filters.minCalories) {
      return false;
    }
    if (filters.maxCalories !== undefined && recipe.calories > filters.maxCalories) {
      return false;
    }
    if (filters.minProtein !== undefined && recipe.protein < filters.minProtein) {
      return false;
    }
    if (filters.dietTags && filters.dietTags.length > 0) {
      const matchesAll = filters.dietTags.every((tag) => recipe.dietTags.includes(tag));
      if (!matchesAll) return false;
    }
    if (filters.mealTypeTags && filters.mealTypeTags.length > 0) {
      const matchesAny = filters.mealTypeTags.some((tag) =>
        recipe.mealTypeTags.includes(tag)
      );
      if (!matchesAny) return false;
    }
    return true;
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/filterRecipes.test.ts`
Expected: PASS — 9 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/lib/filterRecipes.ts src/lib/filterRecipes.test.ts
git commit -m "feat: add filterRecipes with tests"
```

---

### Task 7: Self-hosted fonts and design tokens

Design system revised after visual review (see `docs/superpowers/design-brief-prompt.md` and the follow-up mockup applying it) — same family as AI Auang's dashboard but softer: −38% chroma on the accent, warmer/darker ground, reduced text contrast, proper Thai-script type. Tokens and font choices below come directly from that reviewed design.

**Files:**
- Modify: `package.json`
- Create: `src/styles/tokens.css`

- [ ] **Step 1: Add font dependencies to `package.json`**

Add to `"dependencies"`:

```json
"@fontsource/noto-serif-thai": "^5.3.0",
"@fontsource/anuphan": "^5.3.0",
"@fontsource/jetbrains-mono": "^5.3.0",
```

Run: `npm install`
Expected: installs cleanly.

- [ ] **Step 2: Write `src/styles/tokens.css`**

```css
/* src/styles/tokens.css */
:root {
  --bg-0: #0a0d0f;
  --bg-1: #0f1316;
  --bg-2: #151a1e;
  --bg-3: #1c2226;
  --line: rgba(221, 227, 225, 0.08);
  --line-strong: rgba(221, 227, 225, 0.16);
  --fg: #dde3e1;
  --fg-dim: #8f9a97;
  --fg-faint: #5a6562;
  --green: #3fa877;
  --green-hi: #58c48f;
  --amber: #f5a623;
  --serif: "Noto Serif Thai", serif;
  --sans: "Anuphan", -apple-system, "Segoe UI", sans-serif;
  --mono: "JetBrains Mono", ui-monospace, monospace;
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-pill: 999px;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--bg-0);
  color: var(--fg);
  font-family: var(--sans);
  font-size: 15px;
  line-height: 1.55;
}

a {
  color: inherit;
}
```

- [ ] **Step 3: Verify the build still succeeds**

Run: `npm run build`
Expected: succeeds (tokens.css isn't imported by anything yet — that happens in Task 8 — this step just confirms the new dependencies didn't break the install/build).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/styles/tokens.css
git commit -m "feat: add self-hosted fonts (Fontsource) and revised design tokens"
```

---

### Task 8: `Layout.astro` and `RecipeCard.astro` — redesigned

**Files:**
- Create: `src/components/Layout.astro`
- Create: `src/components/RecipeCard.astro`

- [ ] **Step 1: Write `Layout.astro`**

Imports the fonts and tokens once here since every page uses this layout. The two extra nav items (calorie calculator, meal plan) and their styling exist because they were part of the reviewed design — they are **intentionally non-functional** (`disabled`, `cursor: not-allowed`, a "coming soon" tooltip) since no calorie-calculator or meal-plan feature exists in this plan. Do not wire them to anything.

Weight imports must cover every `font-weight` actually declared against `--sans`/`--serif`/`--mono` in this plan's CSS, or the browser silently falls back to a synthetic/system bold instead of the real font file — exactly the failure mode self-hosting was meant to avoid. Cross-checked against every component in Tasks 8–11: `--sans` (Anuphan) is used at 400 (body default), 600 (`.chip.on`, `.lang-toggle a`, `.log-button`), and 700 (`.detail-body h2`, `.region-tag`); `--serif` (Noto Serif Thai) only ever at 600; `--mono` (JetBrains Mono) at 400 (default) and 700 (macro values).

```astro
---
// src/components/Layout.astro
import "@fontsource/noto-serif-thai/600.css";
import "@fontsource/anuphan/400.css";
import "@fontsource/anuphan/600.css";
import "@fontsource/anuphan/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/700.css";
import "../styles/tokens.css";

interface Props {
  lang: "en" | "th";
  title: string;
}
const { lang, title } = Astro.props;

const comingSoonTitle = lang === "th" ? "เร็วๆ นี้" : "Coming soon";
---
<!doctype html>
<html lang={lang}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title} — Thai Macros</title>
  </head>
  <body>
    <nav class="site-nav">
      <a class="wordmark" href={`/${lang}/`}>
        Thai<span class="accent-dot">·</span>Macros
      </a>
      <div class="nav-links">
        <a href={`/${lang}/`}>{lang === "th" ? "สูตรอาหาร" : "Recipes"}</a>
        <button type="button" class="nav-placeholder" disabled title={comingSoonTitle}>
          {lang === "th" ? "คำนวณแคล" : "Calorie calculator"}
        </button>
        <button type="button" class="nav-placeholder" disabled title={comingSoonTitle}>
          {lang === "th" ? "แผนมื้ออาหาร" : "Meal plan"}
        </button>
      </div>
      <div class="lang-toggle">
        <a href="/en/" aria-current={lang === "en" ? "page" : undefined}>EN</a>
        <a href="/th/" aria-current={lang === "th" ? "page" : undefined}>TH</a>
      </div>
    </nav>
    <main class="page">
      <slot />
    </main>
  </body>
</html>

<style>
  .site-nav {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 18px 28px;
    border-bottom: 1px solid var(--line);
  }
  .wordmark {
    font-family: var(--serif);
    font-weight: 600;
    font-size: 19px;
    text-decoration: none;
    color: var(--fg);
  }
  .wordmark .accent-dot {
    color: var(--green-hi);
  }
  .nav-links {
    display: flex;
    align-items: center;
    gap: 18px;
    flex: 1;
    font-size: 13.5px;
  }
  .nav-links a {
    text-decoration: none;
    color: var(--fg-dim);
  }
  .nav-placeholder {
    background: none;
    border: none;
    color: var(--fg-faint);
    font-family: var(--sans);
    font-size: 13.5px;
    cursor: not-allowed;
    padding: 0;
  }
  .lang-toggle {
    display: flex;
    gap: 2px;
    background: var(--bg-1);
    border: 1px solid var(--line);
    border-radius: var(--radius-pill);
    padding: 3px;
  }
  .lang-toggle a {
    text-decoration: none;
    color: var(--fg-dim);
    font-size: 12.5px;
    font-weight: 600;
    padding: 6px 14px;
    border-radius: var(--radius-pill);
    display: inline-block;
  }
  .lang-toggle a[aria-current="page"] {
    background: var(--green);
    color: var(--bg-0);
  }
  .page {
    max-width: 1180px;
    margin: 0 auto;
    padding: 32px 28px 80px;
  }
</style>
```

- [ ] **Step 2: Write `RecipeCard.astro`**

Server-rendered card used for the initial page load. Its markup and classes (`.recipe-card`, `.card-photo`, `.region-tag`, `.card-body`, `.subtitle`, `.macro-strip`, `.m`/`.v`/`.l`, `.kcal`) are **deliberately duplicated** by the plain-JS `render()` function in Task 9's browse page — Astro component styles can't be imported into a `<script>` block, so the browse page re-declares matching CSS under `#recipe-grid :global(...)`. If this component's markup or class names change, that duplicate block must change too.

```astro
---
// src/components/RecipeCard.astro
import type { RecipeIndexEntry } from "../lib/buildIndexEntry";

interface Props {
  recipe: RecipeIndexEntry;
  lang: "en" | "th";
}
const { recipe, lang } = Astro.props;
const title = lang === "th" ? recipe.title_th : recipe.title_en;
const subtitle = lang === "th" ? recipe.title_en : recipe.title_th;
const regionTag = recipe.regionTags[0];
---
<a class="recipe-card" href={`/${lang}/recipes/${recipe.id}`}>
  <div class="card-photo" style={`background-image: url(${recipe.photo})`}>
    {regionTag && <span class="region-tag">{regionTag}</span>}
  </div>
  <div class="card-body">
    <h3>{title}</h3>
    <p class="subtitle">{subtitle}</p>
    <div class="macro-strip">
      <div class="m kcal"><span class="v">{recipe.calories}</span><span class="l">kcal</span></div>
      <div class="m"><span class="v">{recipe.protein}g</span><span class="l">protein</span></div>
      <div class="m"><span class="v">{recipe.carbs}g</span><span class="l">carbs</span></div>
      <div class="m"><span class="v">{recipe.fat}g</span><span class="l">fat</span></div>
    </div>
  </div>
</a>

<style>
  .recipe-card {
    display: block;
    text-decoration: none;
    color: inherit;
    border-radius: var(--radius-md);
    overflow: hidden;
    background: var(--bg-1);
    border: 1px solid var(--line);
    transition: border-color 0.15s, transform 0.15s;
  }
  .recipe-card:hover {
    border-color: var(--line-strong);
    transform: translateY(-2px);
  }
  .card-photo {
    aspect-ratio: 4 / 3;
    background-color: var(--bg-2);
    background-size: cover;
    background-position: center;
    display: flex;
    align-items: flex-end;
    padding: 12px;
  }
  .region-tag {
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 700;
    background: rgba(0, 0, 0, 0.4);
    color: var(--fg);
    padding: 4px 9px;
    border-radius: var(--radius-pill);
  }
  .card-body {
    padding: 14px 16px 16px;
  }
  .card-body h3 {
    font-family: var(--serif);
    font-weight: 600;
    font-size: 17px;
    margin: 0 0 2px;
    line-height: 1.25;
  }
  .card-body .subtitle {
    font-size: 12.5px;
    color: var(--fg-faint);
    margin: 0 0 10px;
  }
  .macro-strip {
    display: flex;
    gap: 12px;
    padding-top: 10px;
    border-top: 1px solid var(--line);
  }
  .macro-strip .m {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .macro-strip .m .v {
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    font-size: 13px;
    color: var(--fg);
  }
  .macro-strip .m .l {
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--fg-faint);
  }
  .macro-strip .m.kcal .v {
    color: var(--amber);
  }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Layout.astro src/components/RecipeCard.astro
git commit -m "feat: redesigned Layout and RecipeCard with AI-Auang-derived tokens and fonts"
```

---

### Task 9: `sortRecipes` and the browse/grid page — redesigned

**Files:**
- Create: `src/lib/sortRecipes.ts`
- Test: `src/lib/sortRecipes.test.ts`
- Create: `src/pages/[lang]/index.astro`

- [ ] **Step 1: Write the failing test for `sortRecipes`**

```ts
// src/lib/sortRecipes.test.ts
import { describe, it, expect } from "vitest";
import { sortRecipes } from "./sortRecipes";
import type { RecipeIndexEntry } from "./buildIndexEntry";

const low: RecipeIndexEntry = {
  id: "low", title_th: "", title_en: "Low", photo: "",
  calories: 100, protein: 5, carbs: 0, fat: 0,
  dietTags: [], mealTypeTags: [], regionTags: [],
};
const high: RecipeIndexEntry = {
  id: "high", title_th: "", title_en: "High", photo: "",
  calories: 500, protein: 30, carbs: 0, fat: 0,
  dietTags: [], mealTypeTags: [], regionTags: [],
};

describe("sortRecipes", () => {
  it("sorts by protein descending by default", () => {
    expect(sortRecipes([low, high], "protein")).toEqual([high, low]);
  });

  it("sorts by protein ascending when requested", () => {
    expect(sortRecipes([low, high], "protein", "asc")).toEqual([low, high]);
  });

  it("sorts by calories", () => {
    expect(sortRecipes([high, low], "calories", "asc")).toEqual([low, high]);
  });

  it("does not mutate the input array", () => {
    const input = [low, high];
    sortRecipes(input, "protein");
    expect(input).toEqual([low, high]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/sortRecipes.test.ts`
Expected: FAIL — `Cannot find module './sortRecipes'`

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/sortRecipes.ts
import type { RecipeIndexEntry } from "./buildIndexEntry";

export type SortField = "protein" | "calories";
export type SortDirection = "asc" | "desc";

export function sortRecipes(
  recipes: RecipeIndexEntry[],
  field: SortField,
  direction: SortDirection = "desc"
): RecipeIndexEntry[] {
  const sorted = [...recipes].sort((a, b) => a[field] - b[field]);
  return direction === "desc" ? sorted.reverse() : sorted;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/sortRecipes.test.ts`
Expected: PASS — 4 tests passed

- [ ] **Step 5: Write the browse page**

Filter bar (search + max-calories + sort) sits above a row of preset chips (matching the reviewed design), which sits above the grid. Presets are shortcuts that set specific `filterRecipes` criteria — `high-protein`/`low-carb`/`vegetarian` set `dietTags`, `low-cal` sets a fixed `maxCalories` of 300, `one-dish` sets `mealTypeTags`. `one-dish` is a plain string tag value in the existing free-form `mealTypeTags` array — no schema change; recipes need `one-dish` added to their `mealTypeTags` list to appear under that preset (the two sample recipes don't have it, so that preset legitimately returns zero results until a recipe is tagged with it — this is expected, not a bug). When the `low-cal` preset is active it overrides the manual max-calories field; otherwise the manual field applies.

```astro
---
// src/pages/[lang]/index.astro
import { getCollection } from "astro:content";
import Layout from "../../components/Layout.astro";
import RecipeCard from "../../components/RecipeCard.astro";
import { buildIndexEntry } from "../../lib/buildIndexEntry";

export async function getStaticPaths() {
  return [{ params: { lang: "en" } }, { params: { lang: "th" } }];
}

const { lang } = Astro.params as { lang: "en" | "th" };
const collection = await getCollection("recipes");
const index = collection.map((entry) => buildIndexEntry(entry.id, entry.data));

const PRESETS = [
  { id: "all", th: "ทั้งหมด", en: "All" },
  { id: "high-protein", th: "โปรตีนสูง", en: "High protein" },
  { id: "low-cal", th: "แคลต่ำ", en: "Low cal" },
  { id: "low-carb", th: "คาร์บต่ำ", en: "Low carb" },
  { id: "vegetarian", th: "มังสวิรัติ", en: "Vegetarian" },
  { id: "one-dish", th: "จานเดียว", en: "One dish" },
];
---
<Layout lang={lang} title={lang === "th" ? "สูตรอาหาร" : "Recipes"}>
  <script type="application/json" id="recipe-index" set:html={JSON.stringify(index)} />

  <div class="filter-bar">
    <input
      type="search"
      id="search-input"
      class="search-field"
      placeholder={lang === "th" ? "ค้นหาเมนู" : "Search dishes"}
    />
    <div class="range-field">
      <span class="range-label">{lang === "th" ? "แคล/เสิร์ฟ ≤" : "kcal/serving ≤"}</span>
      <input type="number" id="max-calories" min="0" />
    </div>
    <select id="sort-select" class="sort-select">
      <option value="">{lang === "th" ? "เรียงตาม" : "Sort"}</option>
      <option value="protein-desc">{lang === "th" ? "โปรตีนสูงสุด" : "Protein ↓"}</option>
      <option value="protein-asc">{lang === "th" ? "โปรตีนต่ำสุด" : "Protein ↑"}</option>
      <option value="calories-asc">{lang === "th" ? "แคลน้อยสุด" : "Calories ↑"}</option>
      <option value="calories-desc">{lang === "th" ? "แคลมากสุด" : "Calories ↓"}</option>
    </select>
  </div>

  <div class="preset-row" id="preset-row">
    {PRESETS.map((p) => (
      <button type="button" class={p.id === "all" ? "chip on" : "chip"} data-preset={p.id}>
        {lang === "th" ? p.th : p.en}
      </button>
    ))}
  </div>

  <div class="grid-title">
    <h2>{lang === "th" ? "สูตรอาหาร" : "Recipes"}</h2>
    <span class="count" id="result-count"></span>
  </div>

  <p id="empty-state" hidden>
    {lang === "th" ? "ไม่พบสูตรอาหารที่ตรงกัน ลองปรับตัวกรอง" : "No recipes match, try loosening filters"}
  </p>

  <div id="recipe-grid" class="recipe-grid">
    {collection.map((entry) => (
      <RecipeCard recipe={buildIndexEntry(entry.id, entry.data)} lang={lang} />
    ))}
  </div>
</Layout>

<script>
  import { filterRecipes, type RecipeFilters } from "../../lib/filterRecipes";
  import { sortRecipes, type SortField, type SortDirection } from "../../lib/sortRecipes";
  import type { RecipeIndexEntry } from "../../lib/buildIndexEntry";

  const dataEl = document.getElementById("recipe-index");
  const allRecipes: RecipeIndexEntry[] = JSON.parse(dataEl?.textContent ?? "[]");
  const grid = document.getElementById("recipe-grid") as HTMLDivElement;
  const emptyState = document.getElementById("empty-state") as HTMLParagraphElement;
  const resultCount = document.getElementById("result-count") as HTMLSpanElement;
  const searchInput = document.getElementById("search-input") as HTMLInputElement;
  const maxCaloriesInput = document.getElementById("max-calories") as HTMLInputElement;
  const sortSelect = document.getElementById("sort-select") as HTMLSelectElement;
  const presetRow = document.getElementById("preset-row") as HTMLDivElement;
  const lang = (document.documentElement.lang === "th" ? "th" : "en") as "th" | "en";

  let activePreset = "all";

  function presetToFilters(preset: string): Partial<RecipeFilters> {
    switch (preset) {
      case "high-protein":
        return { dietTags: ["high-protein"] };
      case "low-cal":
        return { maxCalories: 300 };
      case "low-carb":
        return { dietTags: ["low-carb"] };
      case "vegetarian":
        return { dietTags: ["vegetarian"] };
      case "one-dish":
        return { mealTypeTags: ["one-dish"] };
      default:
        return {};
    }
  }

  function render() {
    const search = searchInput.value.trim();
    const manualMaxCalories = maxCaloriesInput.value ? Number(maxCaloriesInput.value) : undefined;
    const presetFilters = presetToFilters(activePreset);

    const filters: RecipeFilters = {
      lang,
      search: search || undefined,
      maxCalories: presetFilters.maxCalories ?? manualMaxCalories,
      dietTags: presetFilters.dietTags,
      mealTypeTags: presetFilters.mealTypeTags,
    };

    let results = filterRecipes(allRecipes, filters);

    if (sortSelect.value) {
      const [field, direction] = sortSelect.value.split("-") as [SortField, SortDirection];
      results = sortRecipes(results, field, direction);
    }

    grid.innerHTML = results
      .map((r) => {
        const title = lang === "th" ? r.title_th : r.title_en;
        const subtitle = lang === "th" ? r.title_en : r.title_th;
        const regionTag = r.regionTags[0];
        return `<a class="recipe-card" href="/${lang}/recipes/${r.id}">
          <div class="card-photo" style="background-image: url(${r.photo})">
            ${regionTag ? `<span class="region-tag">${regionTag}</span>` : ""}
          </div>
          <div class="card-body">
            <h3>${title}</h3>
            <p class="subtitle">${subtitle}</p>
            <div class="macro-strip">
              <div class="m kcal"><span class="v">${r.calories}</span><span class="l">kcal</span></div>
              <div class="m"><span class="v">${r.protein}g</span><span class="l">protein</span></div>
              <div class="m"><span class="v">${r.carbs}g</span><span class="l">carbs</span></div>
              <div class="m"><span class="v">${r.fat}g</span><span class="l">fat</span></div>
            </div>
          </div>
        </a>`;
      })
      .join("");

    emptyState.hidden = results.length > 0;
    grid.hidden = results.length === 0;
    resultCount.textContent =
      lang === "th" ? `${results.length} เมนูที่ตรงกับเงื่อนไข` : `${results.length} recipes matched`;
  }

  searchInput.addEventListener("input", render);
  maxCaloriesInput.addEventListener("input", render);
  sortSelect.addEventListener("change", render);
  presetRow.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-preset]");
    if (!button) return;
    activePreset = button.dataset.preset ?? "all";
    presetRow.querySelectorAll(".chip").forEach((chip) => chip.classList.remove("on"));
    button.classList.add("on");
    render();
  });

  render();
</script>

<style>
  .filter-bar {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }
  .search-field {
    flex: 1;
    min-width: 200px;
    background: var(--bg-1);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    padding: 10px 14px;
    color: var(--fg);
    font-family: var(--sans);
    font-size: 13.5px;
  }
  .search-field::placeholder {
    color: var(--fg-faint);
  }
  .range-field {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--bg-1);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    padding: 8px 12px;
  }
  .range-label {
    font-size: 12px;
    color: var(--fg-faint);
    white-space: nowrap;
  }
  .range-field input {
    width: 64px;
    background: none;
    border: none;
    color: var(--fg);
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
    font-size: 13px;
  }
  .sort-select {
    background: var(--bg-1);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    padding: 9px 12px;
    color: var(--fg);
    font-family: var(--sans);
    font-size: 13px;
  }
  .preset-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 28px;
  }
  .chip {
    font-family: var(--sans);
    font-size: 12.5px;
    padding: 7px 14px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--line);
    color: var(--fg-dim);
    background: var(--bg-1);
    cursor: pointer;
  }
  .chip.on {
    background: color-mix(in srgb, var(--green) 16%, transparent);
    border-color: var(--green);
    color: var(--green-hi);
    font-weight: 600;
  }
  .grid-title {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 18px;
  }
  .grid-title h2 {
    font-family: var(--serif);
    font-weight: 600;
    font-size: 22px;
    margin: 0;
  }
  .grid-title .count {
    color: var(--fg-faint);
    font-size: 12.5px;
  }
  .recipe-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 18px;
  }
  /* Duplicated from RecipeCard.astro — see the note in Task 8 Step 2. Needed
     because the client script's render() re-renders cards as raw HTML strings
     on every filter change, and Astro component <style> blocks can't be
     imported into a <script> tag. */
  #recipe-grid :global(.recipe-card) {
    display: block;
    text-decoration: none;
    color: inherit;
    border-radius: var(--radius-md);
    overflow: hidden;
    background: var(--bg-1);
    border: 1px solid var(--line);
    transition: border-color 0.15s, transform 0.15s;
  }
  #recipe-grid :global(.recipe-card:hover) {
    border-color: var(--line-strong);
    transform: translateY(-2px);
  }
  #recipe-grid :global(.card-photo) {
    aspect-ratio: 4 / 3;
    background-color: var(--bg-2);
    background-size: cover;
    background-position: center;
    display: flex;
    align-items: flex-end;
    padding: 12px;
  }
  #recipe-grid :global(.region-tag) {
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 700;
    background: rgba(0, 0, 0, 0.4);
    color: var(--fg);
    padding: 4px 9px;
    border-radius: var(--radius-pill);
  }
  #recipe-grid :global(.card-body) {
    padding: 14px 16px 16px;
  }
  #recipe-grid :global(.card-body h3) {
    font-family: var(--serif);
    font-weight: 600;
    font-size: 17px;
    margin: 0 0 2px;
    line-height: 1.25;
  }
  #recipe-grid :global(.card-body .subtitle) {
    font-size: 12.5px;
    color: var(--fg-faint);
    margin: 0 0 10px;
  }
  #recipe-grid :global(.macro-strip) {
    display: flex;
    gap: 12px;
    padding-top: 10px;
    border-top: 1px solid var(--line);
  }
  #recipe-grid :global(.macro-strip .m) {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  #recipe-grid :global(.macro-strip .m .v) {
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    font-size: 13px;
    color: var(--fg);
  }
  #recipe-grid :global(.macro-strip .m .l) {
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--fg-faint);
  }
  #recipe-grid :global(.macro-strip .m.kcal .v) {
    color: var(--amber);
  }
</style>
```

- [ ] **Step 6: Verify the build succeeds**

Run: `npm run build`
Expected: succeeds, produces `dist/en/index.html` and `dist/th/index.html`.

- [ ] **Step 7: Manual check — dev server**

Run: `npm run dev`, open `http://localhost:4321/en/`
Expected:
- Both sample recipes render as cards with the new dark/serif/amber-kcal styling, "All" preset active.
- Type "tom" in search — grid narrows to Tom Yum Goong only, count updates to "1 recipes matched".
- Clear search. Click the "High protein" preset — both recipes still show (both are tagged `high-protein`), chip highlights green.
- Click "Low cal" preset — grid empties, "no recipes match" message shows (both sample recipes are over 300 kcal — expected, not a bug).
- Click "All" to reset. Set the kcal field to 400 — only Tom Yum Goong (310 kcal) shows, Pad Thai (486) drops out.
- Change sort to "Protein ↓" with no filters active — Tom Yum Goong (28g protein) lists before Pad Thai (22g).

- [ ] **Step 8: Commit**

```bash
git add src/lib/sortRecipes.ts src/lib/sortRecipes.test.ts "src/pages/[lang]/index.astro"
git commit -m "feat: add sortRecipes and redesigned browse page with preset chips and sort"
```

---

### Task 10: Recipe detail page — redesigned, with the AI Auang log placeholder

**Files:**
- Create: `src/pages/[lang]/recipes/[slug].astro`

The "Log this meal / บันทึกลง AI Auang" button is **intentionally non-functional** — `disabled`, non-interactive styling, a "coming soon" tooltip. It was part of the reviewed design, but wiring it to AI Auang is explicitly out of scope for this plan (see spec Non-Goals) — real wiring is Spec 2's job, once that spec decides the import mechanism.

- [ ] **Step 1: Write the page**

```astro
---
// src/pages/[lang]/recipes/[slug].astro
import { getCollection } from "astro:content";
import Layout from "../../../components/Layout.astro";

export async function getStaticPaths() {
  const collection = await getCollection("recipes");
  const langs = ["en", "th"] as const;
  return langs.flatMap((lang) =>
    collection.map((entry) => ({
      params: { lang, slug: entry.id },
      props: { entry },
    }))
  );
}

const { lang } = Astro.params as { lang: "en" | "th" };
const { entry } = Astro.props;
const { data } = entry;
const title = lang === "th" ? data.title_th : data.title_en;
const subtitle = lang === "th" ? data.title_en : data.title_th;
const logButtonLabel = lang === "th" ? "บันทึกลง AI Auang" : "Log this meal";
const comingSoonTitle = lang === "th" ? "เร็วๆ นี้" : "Coming soon";
---
<Layout lang={lang} title={title}>
  <article class="recipe-detail">
    <div class="hero" style={`background-image: url(${data.photo})`}>
      {data.regionTags[0] && <span class="region-tag">{data.regionTags[0]}</span>}
    </div>

    <div class="detail-body">
      <div class="detail-head">
        <div>
          <h1>{title}</h1>
          <p class="subtitle">{subtitle}</p>
        </div>
        <button type="button" class="log-button" disabled title={comingSoonTitle}>
          {logButtonLabel}
        </button>
      </div>

      <div class="macro-panel">
        <div class="cell kcal">
          <div class="v">{data.calories}</div>
          <div class="l">{lang === "th" ? "แคล" : "Calories"}</div>
        </div>
        <div class="cell">
          <div class="v">{data.protein}g</div>
          <div class="l">{lang === "th" ? "โปรตีน" : "Protein"}</div>
        </div>
        <div class="cell">
          <div class="v">{data.carbs}g</div>
          <div class="l">{lang === "th" ? "คาร์บ" : "Carbs"}</div>
        </div>
        <div class="cell">
          <div class="v">{data.fat}g</div>
          <div class="l">{lang === "th" ? "ไขมัน" : "Fat"}</div>
        </div>
      </div>

      <h2>{lang === "th" ? "ส่วนผสม" : "Ingredients"}</h2>
      <ul class="ing-list">
        {data.ingredients.map((ing) => (
          <li>
            <span>{lang === "th" ? ing.name_th : ing.name_en}</span>
            <span class="amt">{ing.amount}</span>
          </li>
        ))}
      </ul>

      <h2>{lang === "th" ? "วิธีทำ" : "Steps"}</h2>
      <ol class="step-list">
        {data.steps.map((step) => (
          <li>{lang === "th" ? step.th : step.en}</li>
        ))}
      </ol>
    </div>
  </article>
</Layout>

<style>
  .recipe-detail {
    max-width: 640px;
    margin: 0 auto;
    background: var(--bg-1);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
  .hero {
    aspect-ratio: 16 / 9;
    background-color: var(--bg-2);
    background-size: cover;
    background-position: center;
    display: flex;
    align-items: flex-end;
    padding: 22px;
  }
  .region-tag {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 700;
    background: rgba(0, 0, 0, 0.4);
    color: var(--fg);
    padding: 5px 11px;
    border-radius: var(--radius-pill);
  }
  .detail-body {
    padding: 28px 30px 34px;
  }
  .detail-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 22px;
  }
  .detail-body h1 {
    font-family: var(--serif);
    font-weight: 600;
    font-size: 28px;
    margin: 0 0 4px;
  }
  .detail-body .subtitle {
    font-size: 14px;
    color: var(--fg-dim);
    margin: 0;
  }
  .log-button {
    flex: none;
    background: var(--bg-2);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    color: var(--fg-faint);
    font-family: var(--sans);
    font-size: 12.5px;
    font-weight: 600;
    padding: 9px 14px;
    cursor: not-allowed;
    white-space: nowrap;
  }
  .macro-panel {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1px;
    background: var(--line);
    border-radius: var(--radius-sm);
    overflow: hidden;
    margin-bottom: 26px;
  }
  .macro-panel .cell {
    background: var(--bg-1);
    padding: 14px 10px;
    text-align: center;
  }
  .macro-panel .cell .v {
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    font-size: 19px;
    color: var(--fg);
  }
  .macro-panel .cell.kcal .v {
    color: var(--amber);
  }
  .macro-panel .cell .l {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--fg-faint);
    margin-top: 3px;
  }
  .detail-body h2 {
    font-family: var(--sans);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--green-hi);
    font-weight: 700;
    margin: 26px 0 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--line);
  }
  .ing-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }
  .ing-list li {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
  }
  .ing-list li .amt {
    color: var(--fg-faint);
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
  }
  .step-list {
    margin: 0;
    padding: 0;
    list-style: none;
    counter-reset: step;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .step-list li {
    display: flex;
    gap: 12px;
    font-size: 14px;
    line-height: 1.55;
  }
  .step-list li::before {
    counter-increment: step;
    content: counter(step);
    flex: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--amber) 16%, transparent);
    color: var(--amber);
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--sans);
  }
</style>
```

- [ ] **Step 2: Verify the build succeeds**

Run: `npm run build`
Expected: succeeds, produces detail pages for both sample recipes in both languages.

- [ ] **Step 3: Manual check**

Run: `npm run dev`, open `http://localhost:4321/en/recipes/pad-thai/`
Expected: hero photo area, title + Thai subtitle, macro panel with calories in amber, ingredients, numbered steps. The "Log this meal" button is visibly present but greyed out and unclickable — hovering it shows a "Coming soon" tooltip.

- [ ] **Step 4: Commit**

```bash
git add "src/pages/[lang]/recipes/[slug].astro"
git commit -m "feat: redesigned recipe detail page with non-functional AI Auang log placeholder"
```

---

### Task 11: Tag landing pages

**Files:**
- Create: `src/pages/[lang]/tags/[tag].astro`

- [ ] **Step 1: Write the page**

```astro
---
// src/pages/[lang]/tags/[tag].astro
import { getCollection } from "astro:content";
import Layout from "../../../components/Layout.astro";
import RecipeCard from "../../../components/RecipeCard.astro";
import { buildIndexEntry } from "../../../lib/buildIndexEntry";

export async function getStaticPaths() {
  const collection = await getCollection("recipes");
  const allTags = new Set<string>();
  for (const entry of collection) {
    for (const tag of [
      ...entry.data.dietTags,
      ...entry.data.mealTypeTags,
      ...entry.data.regionTags,
    ]) {
      allTags.add(tag);
    }
  }
  const langs = ["en", "th"] as const;
  return langs.flatMap((lang) =>
    [...allTags].map((tag) => ({
      params: { lang, tag },
      props: {
        tag,
        matches: collection.filter(
          (entry) =>
            entry.data.dietTags.includes(tag) ||
            entry.data.mealTypeTags.includes(tag) ||
            entry.data.regionTags.includes(tag)
        ),
      },
    }))
  );
}

const { lang } = Astro.params as { lang: "en" | "th" };
const { tag, matches } = Astro.props;
---
<Layout lang={lang} title={tag}>
  <h1 class="tag-title">{tag}</h1>
  <div class="recipe-grid">
    {matches.map((entry) => (
      <RecipeCard recipe={buildIndexEntry(entry.id, entry.data)} lang={lang} />
    ))}
  </div>
</Layout>

<style>
  .tag-title {
    font-family: var(--serif);
    font-weight: 600;
    font-size: 26px;
    margin: 0 0 22px;
  }
  .recipe-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 18px;
  }
</style>
```

- [ ] **Step 2: Verify the build succeeds**

Run: `npm run build`
Expected: succeeds, produces routes like `dist/en/tags/high-protein/index.html` listing both sample recipes, and `dist/en/tags/low-carb/index.html` listing only Tom Yum Goong.

- [ ] **Step 3: Commit**

```bash
git add "src/pages/[lang]/tags/[tag].astro"
git commit -m "feat: add tag landing pages"
```

---

### Task 12: Root redirect

**Files:**
- Modify: `src/pages/index.astro` (replaces the Task 1 placeholder)

- [ ] **Step 1: Replace the placeholder with a redirect**

```astro
---
// src/pages/index.astro
return Astro.redirect("/en/");
---
```

- [ ] **Step 2: Verify the build succeeds**

Run: `npm run build`
Expected: succeeds. `dist/index.html` is a redirect page to `/en/`.

- [ ] **Step 3: Manual check**

Run: `npm run dev`, open `http://localhost:4321/`
Expected: browser redirects to `http://localhost:4321/en/` and shows the browse page.

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: redirect site root to /en/"
```

---

### Task 13: Recipe draft script (Claude + Zod structured output)

**Files:**
- Create: `scripts/draft-recipe.ts`
- Test: `scripts/draft-recipe.test.ts`

This script is a standalone CLI, not part of the deployed site. It drafts a recipe via Claude using structured outputs (`zodOutputFormat`) validated against the exact same `recipeSchema` the site's build already enforces, then writes it as a new content file for Bam to review and edit before committing.

- [ ] **Step 1: Write the failing tests**

```ts
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

describe("draftRecipe", () => {
  it("returns the parsed recipe when Claude's output is schema-valid", async () => {
    const fakeClient = {
      messages: { parse: vi.fn().mockResolvedValue({ parsed_output: validRecipe }) },
    } as unknown as Anthropic;
    const result = await draftRecipe(fakeClient, "pad thai");
    expect(result).toEqual(validRecipe);
  });

  it("returns null when Claude's output fails schema validation", async () => {
    const fakeClient = {
      messages: { parse: vi.fn().mockResolvedValue({ parsed_output: null }) },
    } as unknown as Anthropic;
    const result = await draftRecipe(fakeClient, "something ambiguous");
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run scripts/draft-recipe.test.ts`
Expected: FAIL — `Cannot find module './draft-recipe'`

- [ ] **Step 3: Write the implementation**

```ts
// scripts/draft-recipe.ts
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
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

export async function draftRecipe(
  client: Anthropic,
  dishIdea: string
): Promise<Recipe | null> {
  const response = await withRetry(() =>
    client.messages.parse({
      model: "claude-opus-4-7",
      max_tokens: 16000,
      messages: [
        {
          role: "user",
          content: `Draft a Thai recipe for "${dishIdea}". Provide the dish title, a full ingredient list with amounts, numbered cooking steps, and estimated macros (calories, protein, carbs, fat in grams) for one serving — all in BOTH Thai and English. Tag it with relevant diet tags (e.g. high-protein, low-carb, vegetarian), meal-type tags (breakfast, lunch, dinner, snack), and region tags (e.g. central-thai, northern-thai, isaan, southern-thai). Use a placeholder photo path in the form "/images/<english-slug>.jpg" for the photo field.`,
        },
      ],
      output_config: {
        format: zodOutputFormat(recipeSchema),
      },
    })
  );
  return response.parsed_output;
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

// Only run when executed directly (not when imported by the test file).
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run scripts/draft-recipe.test.ts`
Expected: PASS — 8 tests passed

- [ ] **Step 5: Manual check with a real API key**

Requires `ANTHROPIC_API_KEY` set in `.env` (copy `.env.example` to `.env` and fill it in).
Run: `npm run draft -- "green curry chicken"`
Expected: prints "Drafting recipe...", then "Draft written to .../src/content/recipes/green-curry-chicken.md". Open that file — verify it has valid-looking Thai and English content, plausible macros, and non-empty ingredients/steps.

- [ ] **Step 6: Verify the site still builds with the new draft included**

Run: `npm run build`
Expected: succeeds — the drafted file passes the same schema the build enforces (Task 3), since both use `recipeSchema`.

- [ ] **Step 7: Remove the test draft before committing** (it was just to prove the script works end-to-end; real drafts should be reviewed/edited by Bam before being added to git)

```bash
rm src/content/recipes/green-curry-chicken.md
```

- [ ] **Step 8: Commit**

```bash
git add scripts/draft-recipe.ts scripts/draft-recipe.test.ts
git commit -m "feat: add Claude-powered recipe draft script with retry and schema validation"
```

---

### Task 14: Final polish and full-suite verification

**Files:**
- Modify: `package.json` (no functional change — verifying scripts are all correct)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests across every file pass (recipeSchema, buildIndexEntry, filterRecipes, sortRecipes, draft-recipe).

- [ ] **Step 2: Run a full production build**

Run: `npm run build`
Expected: succeeds cleanly, `dist/` contains `index.html` (redirect), `en/index.html`, `th/index.html`, both recipes' detail pages in both languages, and tag pages for `high-protein`, `low-carb`, `lunch`, `dinner`, `central-thai`.

- [ ] **Step 3: Manual smoke test with `npm run preview`**

Run: `npm run preview`, open the printed local URL.
Expected: same behavior as `npm run dev` verified in Tasks 9–10, now against the actual production build output. Specifically re-check: Thai serif renders correctly on dish titles (not a tofu-box fallback), Anuphan renders for Thai body text, the two nav placeholder buttons and the detail page's log button all show visibly but are unclickable with a "coming soon" tooltip.

- [ ] **Step 4: Final commit**

```bash
git add -A
git status
```

Review the output — expect no unstaged changes (everything was committed task-by-task). If clean, no further commit is needed; this step is a final verification, not a new commit.

---

## Out of scope for this plan (per spec Non-Goals)

- AI Auang log import + recommendation engine — future, separate spec. The "Log this meal" button and the calorie-calculator/meal-plan nav items are shipped as **visual placeholders only** in this plan (disabled, non-interactive, "coming soon" tooltip) — real wiring is that future spec's job, including the still-open import-mechanism decision (bot-generated export link vs. shared backend access).
- User accounts / saved favorites.
- Long-form blog-post content format.
- Real recipe photos (the `photo` field points at plausible paths; actual images under `public/images/` are a content task for Bam, not a code task).
- Choosing/configuring the actual deploy target (Vercel/Netlify/Cloudflare Pages) — the spec left this open ("any works, pick at deploy time"); do it when Bam is ready to put this live.

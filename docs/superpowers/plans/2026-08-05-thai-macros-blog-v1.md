# thai-macros-blog v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone, bilingual (Thai/English) Thai-recipe site where every recipe shows macros (calories/protein/carbs/fat), browsable via a real client-side filter (macro range, diet tags, meal type, search), with recipes drafted by Claude and hand-curated before publishing.

**Architecture:** Astro static site (no backend, no database). Each recipe is one Markdown file with bilingual frontmatter, validated at build time by a shared Zod schema (also reused by a standalone Node recipe-drafting script). Filtering runs entirely client-side over a build-time-embedded JSON index — no network round-trip per filter change.

**Tech Stack:** Astro 5 (Content Layer API), TypeScript, Zod, Vitest, `@anthropic-ai/sdk` (draft script only, not part of the deployed site), `tsx` (run the draft script), `yaml` (frontmatter serialization in the draft script).

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
│   │   └── filterRecipes.test.ts
│   ├── components/
│   │   ├── Layout.astro           # <html> shell, nav, language switcher links
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
- Create: `src/pages/index.astro` (placeholder, replaced in Task 11)

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

- [ ] **Step 7: Write a placeholder `src/pages/index.astro`** (replaced for real in Task 11 — Astro requires at least one page to run `dev`/`build` successfully at every intermediate step of this plan)

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

### Task 7: `Layout.astro` and `RecipeCard.astro` components

**Files:**
- Create: `src/components/Layout.astro`
- Create: `src/components/RecipeCard.astro`

- [ ] **Step 1: Write `Layout.astro`**

```astro
---
// src/components/Layout.astro
interface Props {
  lang: "en" | "th";
  title: string;
}
const { lang, title } = Astro.props;
---
<!doctype html>
<html lang={lang}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title} — Thai Macros</title>
  </head>
  <body>
    <nav>
      <a href={`/${lang}/`}>{lang === "th" ? "สูตรอาหาร" : "Recipes"}</a>
      <span class="lang-switcher">
        <a href="/en/" aria-current={lang === "en" ? "page" : undefined}>EN</a>
        ·
        <a href="/th/" aria-current={lang === "th" ? "page" : undefined}>TH</a>
      </span>
    </nav>
    <main>
      <slot />
    </main>
  </body>
</html>
```

- [ ] **Step 2: Write `RecipeCard.astro`**

Server-rendered card used for the initial page load. Its HTML shape is deliberately mirrored (not shared via import — Astro components can't be rendered from a `<script>` block) by the plain-JS `renderGrid()` function in Task 8's browse page, so client-side re-filtering produces visually identical cards.

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
---
<a class="recipe-card" href={`/${lang}/recipes/${recipe.id}`}>
  <img src={recipe.photo} alt={title} loading="lazy" />
  <h3>{title}</h3>
  <p class="macros">{recipe.calories} kcal · {recipe.protein}g protein</p>
</a>

<style>
  .recipe-card {
    display: block;
    text-decoration: none;
    color: inherit;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
  }
  .recipe-card img {
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    display: block;
  }
  .recipe-card h3 {
    margin: 0.5rem 0.75rem 0.25rem;
    font-size: 1rem;
  }
  .recipe-card .macros {
    margin: 0 0.75rem 0.75rem;
    font-size: 0.85rem;
    color: #666;
  }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Layout.astro src/components/RecipeCard.astro
git commit -m "feat: add Layout and RecipeCard components"
```

---

### Task 8: Browse/grid page with client-side filtering

**Files:**
- Create: `src/pages/[lang]/index.astro`

- [ ] **Step 1: Write the page**

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
const allDietTags = [...new Set(index.flatMap((r) => r.dietTags))].sort();
const allMealTypeTags = [...new Set(index.flatMap((r) => r.mealTypeTags))].sort();
---
<Layout lang={lang} title={lang === "th" ? "สูตรอาหาร" : "Recipes"}>
  <script type="application/json" id="recipe-index" set:html={JSON.stringify(index)} />

  <form id="filter-form">
    <input
      type="search"
      id="search-input"
      placeholder={lang === "th" ? "ค้นหาสูตรอาหาร" : "Search recipes"}
    />
    <label>
      {lang === "th" ? "แคลอรี่ต่ำสุด" : "Min calories"}
      <input type="number" id="min-calories" min="0" />
    </label>
    <label>
      {lang === "th" ? "แคลอรี่สูงสุด" : "Max calories"}
      <input type="number" id="max-calories" min="0" />
    </label>
    <label>
      {lang === "th" ? "โปรตีนขั้นต่ำ (กรัม)" : "Min protein (g)"}
      <input type="number" id="min-protein" min="0" />
    </label>
    <fieldset>
      <legend>{lang === "th" ? "ประเภทอาหาร" : "Diet"}</legend>
      {allDietTags.map((tag) => (
        <label><input type="checkbox" name="dietTags" value={tag} /> {tag}</label>
      ))}
    </fieldset>
    <fieldset>
      <legend>{lang === "th" ? "มื้ออาหาร" : "Meal type"}</legend>
      {allMealTypeTags.map((tag) => (
        <label><input type="checkbox" name="mealTypeTags" value={tag} /> {tag}</label>
      ))}
    </fieldset>
  </form>

  <p id="empty-state" hidden>
    {lang === "th" ? "ไม่พบสูตรอาหารที่ตรงกัน ลองปรับตัวกรอง" : "No recipes match, try loosening filters"}
  </p>

  <div id="recipe-grid" class="grid">
    {collection.map((entry) => (
      <RecipeCard recipe={buildIndexEntry(entry.id, entry.data)} lang={lang} />
    ))}
  </div>
</Layout>

<script>
  import { filterRecipes, type RecipeFilters } from "../../lib/filterRecipes";
  import type { RecipeIndexEntry } from "../../lib/buildIndexEntry";

  const dataEl = document.getElementById("recipe-index");
  const allRecipes: RecipeIndexEntry[] = JSON.parse(dataEl?.textContent ?? "[]");
  const grid = document.getElementById("recipe-grid") as HTMLDivElement;
  const emptyState = document.getElementById("empty-state") as HTMLParagraphElement;
  const form = document.getElementById("filter-form") as HTMLFormElement;
  const lang = (document.documentElement.lang === "th" ? "th" : "en") as "th" | "en";

  function currentFilters(): RecipeFilters {
    const search = (document.getElementById("search-input") as HTMLInputElement).value.trim();
    const minCalories = (document.getElementById("min-calories") as HTMLInputElement).value;
    const maxCalories = (document.getElementById("max-calories") as HTMLInputElement).value;
    const minProtein = (document.getElementById("min-protein") as HTMLInputElement).value;
    const dietTags = Array.from(
      form.querySelectorAll<HTMLInputElement>('input[name="dietTags"]:checked')
    ).map((el) => el.value);
    const mealTypeTags = Array.from(
      form.querySelectorAll<HTMLInputElement>('input[name="mealTypeTags"]:checked')
    ).map((el) => el.value);
    return {
      lang,
      search: search || undefined,
      minCalories: minCalories ? Number(minCalories) : undefined,
      maxCalories: maxCalories ? Number(maxCalories) : undefined,
      minProtein: minProtein ? Number(minProtein) : undefined,
      dietTags: dietTags.length ? dietTags : undefined,
      mealTypeTags: mealTypeTags.length ? mealTypeTags : undefined,
    };
  }

  function renderGrid(recipes: RecipeIndexEntry[]) {
    grid.innerHTML = recipes
      .map((r) => {
        const title = lang === "th" ? r.title_th : r.title_en;
        return `<a class="recipe-card" href="/${lang}/recipes/${r.id}">
          <img src="${r.photo}" alt="${title}" loading="lazy" />
          <h3>${title}</h3>
          <p class="macros">${r.calories} kcal · ${r.protein}g protein</p>
        </a>`;
      })
      .join("");
    emptyState.hidden = recipes.length > 0;
    grid.hidden = recipes.length === 0;
  }

  form.addEventListener("input", () => {
    renderGrid(filterRecipes(allRecipes, currentFilters()));
  });
</script>
```

- [ ] **Step 2: Verify the build succeeds**

Run: `npm run build`
Expected: succeeds, produces `dist/en/index.html` and `dist/th/index.html`.

- [ ] **Step 3: Manual check — dev server**

Run: `npm run dev`, open `http://localhost:4321/en/`
Expected: both sample recipes render as cards. Type "tom" in search — grid narrows to Tom Yum Goong only. Clear search, check the "high-protein" diet checkbox — both recipes still show (both are tagged high-protein). Set min calories to 400 — only Pad Thai shows. Set min calories to 10000 — grid empties and the "no recipes match" message appears.

- [ ] **Step 4: Commit**

```bash
git add "src/pages/[lang]/index.astro"
git commit -m "feat: add browse page with client-side macro/tag/search filtering"
```

---

### Task 9: Recipe detail page

**Files:**
- Create: `src/pages/[lang]/recipes/[slug].astro`

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
---
<Layout lang={lang} title={title}>
  <article>
    <img src={data.photo} alt={title} />
    <h1>{title}</h1>
    <dl class="macros">
      <div><dt>{lang === "th" ? "แคลอรี่" : "Calories"}</dt><dd>{data.calories} kcal</dd></div>
      <div><dt>{lang === "th" ? "โปรตีน" : "Protein"}</dt><dd>{data.protein}g</dd></div>
      <div><dt>{lang === "th" ? "คาร์บ" : "Carbs"}</dt><dd>{data.carbs}g</dd></div>
      <div><dt>{lang === "th" ? "ไขมัน" : "Fat"}</dt><dd>{data.fat}g</dd></div>
    </dl>

    <h2>{lang === "th" ? "ส่วนผสม" : "Ingredients"}</h2>
    <ul class="ingredients">
      {data.ingredients.map((ing) => (
        <li>{lang === "th" ? ing.name_th : ing.name_en} — {ing.amount}</li>
      ))}
    </ul>

    <h2>{lang === "th" ? "วิธีทำ" : "Steps"}</h2>
    <ol class="steps">
      {data.steps.map((step) => (
        <li>{lang === "th" ? step.th : step.en}</li>
      ))}
    </ol>
  </article>
</Layout>
```

- [ ] **Step 2: Verify the build succeeds**

Run: `npm run build`
Expected: succeeds, produces `dist/en/recipes/pad-thai/index.html`, `dist/th/recipes/pad-thai/index.html`, and the same pair for `tom-yum-goong`.

- [ ] **Step 3: Manual check**

Run: `npm run dev`, open `http://localhost:4321/en/recipes/pad-thai/`
Expected: shows title, 4 macros, 5 ingredients, 5 numbered steps, all in English. Open `http://localhost:4321/th/recipes/pad-thai/` — same recipe, all fields in Thai.

- [ ] **Step 4: Commit**

```bash
git add "src/pages/[lang]/recipes/[slug].astro"
git commit -m "feat: add recipe detail page"
```

---

### Task 10: Tag landing pages

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
  <h1>{tag}</h1>
  <div class="grid">
    {matches.map((entry) => (
      <RecipeCard recipe={buildIndexEntry(entry.id, entry.data)} lang={lang} />
    ))}
  </div>
</Layout>
```

- [ ] **Step 2: Verify the build succeeds**

Run: `npm run build`
Expected: succeeds, produces routes like `dist/en/tags/high-protein/index.html` listing both sample recipes (both are tagged `high-protein`), and `dist/en/tags/low-carb/index.html` listing only Tom Yum Goong.

- [ ] **Step 3: Commit**

```bash
git add "src/pages/[lang]/tags/[tag].astro"
git commit -m "feat: add tag landing pages"
```

---

### Task 11: Root redirect

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

### Task 12: Recipe draft script (Claude + Zod structured output)

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

### Task 13: Final polish and full-suite verification

**Files:**
- Modify: `package.json` (no functional change — verifying scripts are all correct)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests across every file pass (recipeSchema, buildIndexEntry, filterRecipes, draft-recipe).

- [ ] **Step 2: Run a full production build**

Run: `npm run build`
Expected: succeeds cleanly, `dist/` contains `index.html` (redirect), `en/index.html`, `th/index.html`, both recipes' detail pages in both languages, and tag pages for `high-protein`, `low-carb`, `lunch`, `dinner`, `central-thai`.

- [ ] **Step 3: Manual smoke test with `npm run preview`**

Run: `npm run preview`, open the printed local URL.
Expected: same behavior as `npm run dev` verified in Tasks 8–9, now against the actual production build output.

- [ ] **Step 4: Final commit**

```bash
git add -A
git status
```

Review the output — expect no unstaged changes (everything was committed task-by-task). If clean, no further commit is needed; this step is a final verification, not a new commit.

---

## Out of scope for this plan (per spec Non-Goals)

- AI Auang log import + recommendation engine — future, separate spec.
- User accounts / saved favorites.
- Long-form blog-post content format.
- Real recipe photos (the `photo` field points at plausible paths; actual images under `public/images/` are a content task for Bam, not a code task).
- Choosing/configuring the actual deploy target (Vercel/Netlify/Cloudflare Pages) — the spec left this open ("any works, pick at deploy time"); do it when Bam is ready to put this live.

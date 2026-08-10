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

// A protein swap (e.g. chicken breast vs. pork tenderloin vs. lean beef) — each
// option carries the FULL recalculated dish totals with that protein in place,
// not a delta, so the recipe page can just display the option's numbers directly
// with no client-side arithmetic. Convention: when proteinOptions is present,
// options[0] is the default and its calories/protein/carbs/fat MUST match the
// recipe's own top-level macro fields (the recipe page's initial server-rendered
// numbers come from the top-level fields; the swap UI's first chip must show the
// same numbers as what's already on screen, or selecting it would visibly change
// nothing while every other chip's numbers move).
export const proteinOptionSchema = z.object({
  label_th: z.string().min(1),
  label_en: z.string().min(1),
  amount: z.string().min(1),
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
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
  proteinOptions: z.array(proteinOptionSchema).min(2).optional(),
});

export type Recipe = z.infer<typeof recipeSchema>;

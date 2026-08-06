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

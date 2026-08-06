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

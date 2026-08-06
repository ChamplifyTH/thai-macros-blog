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

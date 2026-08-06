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

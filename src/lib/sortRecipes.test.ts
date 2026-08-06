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

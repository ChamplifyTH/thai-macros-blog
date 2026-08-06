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

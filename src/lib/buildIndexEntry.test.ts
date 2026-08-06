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

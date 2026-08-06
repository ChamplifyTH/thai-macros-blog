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

  it("accepts a recipe with a zero macro value", () => {
    const result = recipeSchema.safeParse({ ...validRecipe, fat: 0 });
    expect(result.success).toBe(true);
  });
});

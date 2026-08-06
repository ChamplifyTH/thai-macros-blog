import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { recipeSchema } from "./content/recipeSchema";

const recipes = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/recipes" }),
  schema: recipeSchema,
});

export const collections = { recipes };

import { z } from "zod";

export const createCompanySchema = z.object({
  nom: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères.")
    .max(150, "Le nom ne doit pas dépasser 150 caractères."),
});
import { z } from "zod";

export const userIdentitySchema = z.object({
  nom: z.string().trim().min(2).max(150),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Adresse e-mail invalide.")
    .max(254),

  password: z
    .string()
    .min(12, "Minimum 12 caractères.")
    .max(72)
    .refine(
      (value) => new TextEncoder().encode(value).length <= 72,
      "Le mot de passe ne doit pas dépasser 72 octets.",
    ),
});

export const createManagerSchema = userIdentitySchema.extend({
  societeId: z.string().uuid("Sélectionne une société."),
});

export const createCollaboratorSchema = userIdentitySchema.extend({
  serviceId: z.string().uuid("Sélectionne un service."),
});
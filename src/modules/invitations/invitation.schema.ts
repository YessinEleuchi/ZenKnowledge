import { z } from "zod";

export const invitationTokenSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/, "Lien d’invitation invalide.");

export const acceptInvitationSchema = z
  .object({
    token: invitationTokenSchema,

    password: z
      .string()
      .min(12, "Utilise au moins 12 caractères.")
      .max(72, "Le mot de passe est trop long.")
      .refine(
        (value) => new TextEncoder().encode(value).length <= 72,
        "Le mot de passe ne doit pas dépasser 72 octets.",
      ),

    confirmPassword: z.string().min(1, "Confirme ton mot de passe."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Les mots de passe ne correspondent pas.",
  });
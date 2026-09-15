"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sendInvitationEmail } from "@/server/workflows/invitation";
import { Prisma } from "@/generated/prisma/client";
import { requireUserManager } from "@/server/auth/session";
import type {
  CreateUserState,
} from "../user.types";
import { createUser, UserAssignmentError } from "./user.dal";

export async function createUserAction(
  _previousState: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  await requireUserManager();

  const input = {
    nom: formData.get("nom"),
    email: formData.get("email"),
    societeId: formData.get("societeId"),
    serviceId: formData.get("serviceId"),
  };

  let createdUser: Awaited<ReturnType<typeof createUser>>;

  try {
    createdUser = await createUser(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        status: "error",
        message: "Vérifie les informations saisies.",
        fieldErrors: error.flatten().fieldErrors,
      };
    }

    if (error instanceof UserAssignmentError) {
      return {
        status: "error",
        message: error.message,
        fieldErrors: {
          [error.field]: [error.message],
        },
      };
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          status: "error",
          message: "Cette adresse e-mail est indisponible.",
          fieldErrors: {
            email: ["Utilise une autre adresse e-mail."],
          },
        };
      }

      if (error.code === "P2003") {
        return {
          status: "error",
          message: "La société ou le service n’est plus disponible.",
        };
      }
    }

    // Laisse se propager les redirections et erreurs inattendues.
    throw error;
  }



  let invitationConfirmed = false;

  try {
    await sendInvitationEmail({
      invitationId: createdUser.invitationId,
      nom: createdUser.nom,
      email: createdUser.email,
      invitationUrl: createdUser.invitationUrl,
    });

    invitationConfirmed = true;
  } catch (error) {
  console.error("Échec de l’envoi de l’invitation :", {
    userId: createdUser.id,
    cause: error instanceof Error ? error.message : "Erreur inconnue",
  });
}

  revalidatePath("/users");
  revalidatePath("/companies");

  if (createdUser.societeId) {
    revalidatePath(`/companies/${createdUser.societeId}`);
  }

  return {
    status: "success",
    message: invitationConfirmed
      ? `Compte créé pour ${createdUser.nom}. Invitation transmise au serveur de messagerie.`
      : `Compte créé pour ${createdUser.nom}, mais l’envoi de l’invitation n’a pas été confirmé. Ne recrée pas le compte.`,
  };
}
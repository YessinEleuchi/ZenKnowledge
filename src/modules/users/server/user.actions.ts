"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

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
    password: formData.get("password"),
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

  revalidatePath("/users");
  revalidatePath("/companies");

  if (createdUser.societeId) {
    revalidatePath(`/companies/${createdUser.societeId}`);
  }

  return {
    status: "success",
    message: `Le compte de ${createdUser.nom} a été créé.`,
  };
}
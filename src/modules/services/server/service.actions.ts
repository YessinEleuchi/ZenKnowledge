"use server";

import { revalidatePath } from "next/cache";

import { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/server/auth/session";
import { createServiceSchema } from "../service.schema";
import { createService } from "./service.dal";
import type { CreateServiceState } from "../service.types";


export async function createServiceAction(
  _previousState: CreateServiceState,
  formData: FormData,
): Promise<CreateServiceState> {
  await requireAdmin();

  const parsed = createServiceSchema.safeParse({
    societeId: formData.get("societeId"),
    nom: formData.get("nom"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Les informations du service sont invalides.",
      fieldErrors: {
        nom: parsed.error.flatten().fieldErrors.nom,
      },
    };
  }

  try {
    await createService(parsed.data);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          status: "error",
          message: "Ce service existe déjà dans cette société.",
          fieldErrors: {
            nom: ["Ce nom est déjà utilisé dans cette société."],
          },
        };
      }

      if (error.code === "P2003") {
        return {
          status: "error",
          message: "La société sélectionnée n’existe plus.",
        };
      }
    }

    return {
      status: "error",
      message: "Impossible de créer le service. Réessaie.",
    };
  }

  revalidatePath(`/companies/${parsed.data.societeId}`);
  revalidatePath("/companies");

  return {
    status: "success",
    message: `Le service « ${parsed.data.nom} » a été créé.`,
  };
}
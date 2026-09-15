"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/server/auth/session";
import { createCompanySchema } from "../company.schema";
import { createCompany } from "./company.dal";

export type CreateCompanyState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: {
    nom?: string[];
  };
};

export async function createCompanyAction(
  _previousState: CreateCompanyState,
  formData: FormData,
): Promise<CreateCompanyState> {
  await requireAdmin();

  const parsed = createCompanySchema.safeParse({
    nom: formData.get("nom"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Vérifie le nom de la société.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
  await createCompany(parsed.data);
} catch (error) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return {
      status: "error",
      message: "Une société portant ce nom existe déjà.",
      fieldErrors: {
        nom: ["Ce nom est déjà utilisé."],
      },
    };
  }

  return {
    status: "error",
    message: "Impossible de créer la société. Réessaie.",
  };
}

  revalidatePath("/companies");

  return {
    status: "success",
    message: `La société « ${parsed.data.nom} » a été créée.`,
  };
}
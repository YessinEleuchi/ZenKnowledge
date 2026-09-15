import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/server/auth";
import { db } from "@/server/db";

export const getCurrentUser = cache(async () => {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const user = await db.utilisateur.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      nom: true,
      email: true,
      role: true,
      actif: true,
      societeId: true,
      serviceId: true,
    },
  });

  if (!user?.actif) {
    return null;
  }

  return {
    id: user.id,
    nom: user.nom,
    email: user.email,
    role: user.role,
    societeId: user.societeId,
    serviceId: user.serviceId,
  };
});

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();

  if (user.role !== "ADMIN") {
    throw new Error("Accès refusé : administrateur requis.");
  }

  return user;
}
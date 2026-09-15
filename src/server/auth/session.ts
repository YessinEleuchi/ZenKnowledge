import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { Role } from "@/types/enums";
import type {
  CurrentUser,
  AdminUser,
  UserManager,
} from "@/types/auth";

export const getCurrentUser = cache(
  async (): Promise<CurrentUser | null> => {
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
  },
);

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdmin(): Promise<AdminUser> {
  const user = await requireUser();

  if (user.role !== Role.ADMIN) {
    throw new Error("Accès refusé : administrateur requis.");
  }

  return {
    ...user,
    role: Role.ADMIN,
  };
}

export async function requireUserManager(): Promise<UserManager> {
  const user = await requireUser();

  if (user.role === Role.ADMIN) {
    return {
      ...user,
      role: Role.ADMIN,
    };
  }

  if (
    user.role === Role.GESTIONNAIRE &&
    user.societeId !== null
  ) {
    return {
      ...user,
      role: Role.GESTIONNAIRE,
      societeId: user.societeId,
    };
  }

  throw new Error("Accès refusé à la gestion des utilisateurs.");
}
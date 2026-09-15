import "server-only";

import { hash } from "bcryptjs";

import { db } from "@/server/db";
import { requireUserManager } from "@/server/auth/session";
import {
  createManagerSchema,
  createCollaboratorSchema,
} from "../user.schema";

import type { UserCreationOptions } from "../user.types";
import { Role } from "@/types/enums";

export class UserAssignmentError extends Error {
  constructor(
    public readonly field: "societeId" | "serviceId",
    message: string,
  ) {
    super(message);
    this.name = "UserAssignmentError";
  }
}

export async function listUsers() {
  const actor = await requireUserManager();

  return db.utilisateur.findMany({
    where:
      actor.role === Role.ADMIN
        ? {}
        : {
            societeId: actor.societeId,
            role: Role.COLLABORATEUR,
          },
    select: {
      id: true,
      nom: true,
      email: true,
      role: true,
      actif: true,
      societe: {
        select: {
          id: true,
          nom: true,
        },
      },
      service: {
        select: {
          id: true,
          nom: true,
        },
      },
    },
    orderBy: [
      { nom: "asc" },
      { id: "asc" },
    ],
  });
}

export async function getUserCreationOptions(): Promise<UserCreationOptions> {
  const actor = await requireUserManager();

  if (actor.role === Role.ADMIN) {
    const companies = await db.societe.findMany({
      select: { id: true, nom: true },
      orderBy: { nom: "asc" },
    });

    return {
      mode: Role.GESTIONNAIRE,
      companies,
    };
  }

  if (!actor.societeId) {
    throw new Error("Société manquante.");
  }

  const company = await db.societe.findUnique({
    where: { id: actor.societeId },
    select: {
      id: true,
      nom: true,
      services: {
        select: { id: true, nom: true },
        orderBy: { nom: "asc" },
      },
    },
  });

  if (!company) {
    throw new Error("Société introuvable.");
  }

  return {
    mode: Role.COLLABORATEUR,
    company: {
      id: company.id,
      nom: company.nom,
    },
    services: company.services,
  };
}

export async function createUser(input: unknown) {
  const actor = await requireUserManager();

  if (actor.role === Role.ADMIN) {
    const data = createManagerSchema.parse(input);
    const passwordHash = await hash(data.password, 12);

    return db.$transaction(async (tx) => {
      const company = await tx.societe.findUnique({
        where: { id: data.societeId },
        select: { id: true },
      });

      if (!company) {
        throw new UserAssignmentError(
          "societeId",
          "Cette société n’existe plus.",
        );
      }

      return tx.utilisateur.create({
        data: {
          nom: data.nom,
          email: data.email,
          passwordHash,
          role: Role.GESTIONNAIRE,
          societeId: company.id,
          serviceId: null,
          actif: true,
        },
        select: {
          id: true,
          nom: true,
          societeId: true,
        },
      });
    });
  }

  const societeId = actor.societeId;

  if (!societeId) {
    throw new Error("Société manquante.");
  }

  const data = createCollaboratorSchema.parse(input);
  const passwordHash = await hash(data.password, 12);

  return db.$transaction(async (tx) => {
    const service = await tx.service.findFirst({
      where: {
        id: data.serviceId,
        societeId,
      },
      select: { id: true },
    });

    if (!service) {
      throw new UserAssignmentError(
        "serviceId",
        "Sélectionne un service appartenant à ta société.",
      );
    }

    return tx.utilisateur.create({
      data: {
        nom: data.nom,
        email: data.email,
        passwordHash,
        role: Role.COLLABORATEUR,
        societeId,
        serviceId: service.id,
        actif: true,
      },
      select: {
        id: true,
        nom: true,
        societeId: true,
      },
    });
  });
}
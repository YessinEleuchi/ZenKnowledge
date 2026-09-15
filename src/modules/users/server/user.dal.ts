import "server-only";
import { db } from "@/server/db";
import { requireUserManager } from "@/server/auth/session";
import {
  createManagerSchema,
  createCollaboratorSchema,
} from "../user.schema";
import {
  generateInvitationToken,
  buildInvitationUrl,
} from "@/modules/invitations/server/invitation-token";

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

  const data =
    actor.role === Role.ADMIN
      ? createManagerSchema.parse(input)
      : createCollaboratorSchema.parse(input);

  const assignment =
    actor.role === Role.ADMIN && "societeId" in data
      ? {
          role: Role.GESTIONNAIRE,
          societeId: data.societeId,
          serviceId: null,
        }
      : actor.role === Role.GESTIONNAIRE && "serviceId" in data
        ? {
            role: Role.COLLABORATEUR,
            societeId: actor.societeId,
            serviceId: data.serviceId,
          }
        : null;

  if (!assignment) {
    throw new Error("Affectation non autorisée.");
  }

  const invitation = generateInvitationToken();

  // Vérifier APP_URL avant toute écriture.
  const invitationUrl = buildInvitationUrl(invitation.token);

  const result = await db.$transaction(async (tx) => {
    const company = await tx.societe.findUnique({
      where: { id: assignment.societeId },
      select: { id: true },
    });

    if (!company) {
      throw new UserAssignmentError(
        "societeId",
        "Cette société n’existe plus.",
      );
    }

    if (assignment.serviceId) {
      const service = await tx.service.findFirst({
        where: {
          id: assignment.serviceId,
          societeId: assignment.societeId,
        },
        select: { id: true },
      });

      if (!service) {
        throw new UserAssignmentError(
          "serviceId",
          "Ce service n’appartient pas à ta société.",
        );
      }
    }

    const user = await tx.utilisateur.create({
      data: {
        nom: data.nom,
        email: data.email,
        role: assignment.role,
        societeId: assignment.societeId,
        serviceId: assignment.serviceId,
        passwordHash: null,
        actif: true,
      },
      select: {
        id: true,
        nom: true,
        email: true,
        societeId: true,
      },
    });

    const savedInvitation = await tx.invitationUtilisateur.create({
      data: {
        utilisateurId: user.id,
        tokenHash: invitation.tokenHash,
        expireLe: invitation.expireLe,
      },
      select: { id: true },
    });

    return {
      ...user,
      invitationId: savedInvitation.id,
    };
  });

  // Résultat interne serveur : ne pas le retourner au navigateur.
  return {
    ...result,
    invitationUrl,
  };
}
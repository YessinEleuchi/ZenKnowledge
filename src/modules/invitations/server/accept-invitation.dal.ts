import "server-only";

import { createHash } from "node:crypto";
import { hash } from "bcryptjs";

import { db } from "@/server/db";
import {
  acceptInvitationSchema,
  invitationTokenSchema,
} from "../invitation.schema";

export class InvalidInvitationError extends Error {
  constructor() {
    super(
      "Ce lien est invalide, expiré ou déjà utilisé. " +
        "Demande une nouvelle invitation à ton responsable.",
    );

    this.name = "InvalidInvitationError";
  }
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function isInvitationValid(token: string): Promise<boolean> {
  const parsed = invitationTokenSchema.safeParse(token);

  if (!parsed.success) return false;

  const invitation = await db.invitationUtilisateur.findFirst({
    where: {
      tokenHash: hashToken(parsed.data),
      utiliseLe: null,
      expireLe: { gt: new Date() },
      utilisateur: {
        is: {
          actif: true,
          passwordHash: null,
        },
      },
    },
    select: { id: true },
  });

  return invitation !== null;
}

export async function acceptInvitation(input: unknown): Promise<void> {
  const data = acceptInvitationSchema.parse(input);
  const tokenHash = hashToken(data.token);

  // Vérification avant le calcul bcrypt.
  const invitation = await db.invitationUtilisateur.findFirst({
    where: {
      tokenHash,
      utiliseLe: null,
      expireLe: { gt: new Date() },
      utilisateur: {
        is: {
          actif: true,
          passwordHash: null,
        },
      },
    },
    select: {
      id: true,
      utilisateurId: true,
    },
  });

  if (!invitation) {
    throw new InvalidInvitationError();
  }

  const passwordHash = await hash(data.password, 12);

  await db.$transaction(async (tx) => {
    // Cette condition empêche deux invitations du même compte
    // de définir successivement deux mots de passe.
    const updatedUser = await tx.utilisateur.updateMany({
      where: {
        id: invitation.utilisateurId,
        actif: true,
        passwordHash: null,
      },
      data: { passwordHash },
    });

    if (updatedUser.count !== 1) {
      throw new InvalidInvitationError();
    }

    // Recontrôle après bcrypt et acquisition du verrou utilisateur.
    const now = new Date();

    const consumedInvitation = await tx.invitationUtilisateur.updateMany({
      where: {
        id: invitation.id,
        tokenHash,
        utiliseLe: null,
        expireLe: { gt: now },
      },
      data: {
        utiliseLe: now,
      },
    });

    if (consumedInvitation.count !== 1) {
      // L'exception annule également le changement du mot de passe.
      throw new InvalidInvitationError();
    }

    // Invalide aussi les éventuelles autres invitations du compte.
    await tx.invitationUtilisateur.updateMany({
      where: {
        utilisateurId: invitation.utilisateurId,
        utiliseLe: null,
      },
      data: {
        utiliseLe: now,
      },
    });
  });
}
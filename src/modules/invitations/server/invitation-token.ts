import "server-only";

import { createHash, randomBytes } from "node:crypto";

import {
  INVITATION_TOKEN_BYTES,
  INVITATION_TTL_MS,
} from "../invitation.constants";

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateInvitationToken() {
  const token = randomBytes(INVITATION_TOKEN_BYTES).toString("hex");

  return {
    token,
    tokenHash: hashInvitationToken(token),
    expireLe: new Date(Date.now() + INVITATION_TTL_MS),
  };
}

export function buildInvitationUrl(token: string): string {
  const appUrl = process.env.APP_URL;

  if (!appUrl) {
    throw new Error("La variable APP_URL est manquante.");
  }

  const url = new URL("/accept-invitation", appUrl);
  url.searchParams.set("token", token);

  return url.toString();
}
"use server";

import { z } from "zod";

import type { AcceptInvitationState } from "../invitation.types";

import {
  acceptInvitation,
  InvalidInvitationError,
} from "./accept-invitation.dal";

type InvitationFieldErrors = {
  token?: string[];
  password?: string[];
  confirmPassword?: string[];
};

function getInvitationFieldErrors(
  error: z.ZodError,
): InvitationFieldErrors {
  const fieldErrors: InvitationFieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (
      field !== "token" &&
      field !== "password" &&
      field !== "confirmPassword"
    ) {
      continue;
    }

    const messages =
      fieldErrors[field] ?? [];

    messages.push(issue.message);

    fieldErrors[field] = messages;
  }

  return fieldErrors;
}

export async function acceptInvitationAction(
  _previousState: AcceptInvitationState,
  formData: FormData,
): Promise<AcceptInvitationState> {
  try {
    await acceptInvitation({
      token: formData.get("token"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    return {
      status: "success",
      message:
        "Ton mot de passe a été enregistré. Tu peux te connecter.",
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors =
        getInvitationFieldErrors(error);

      return {
        status: "error",

        message:
          errors.token?.length
            ? "Le lien d’invitation est invalide."
            : "Vérifie les informations saisies.",

        fieldErrors: {
          password:
            errors.password,

          confirmPassword:
            errors.confirmPassword,
        },
      };
    }

    if (
      error instanceof
      InvalidInvitationError
    ) {
      return {
        status: "error",
        message: error.message,
      };
    }
    throw error;
  }
}
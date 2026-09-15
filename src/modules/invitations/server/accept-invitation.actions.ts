"use server";

import { z } from "zod";

import type { AcceptInvitationState } from "../invitation.types";
import {
  acceptInvitation,
  InvalidInvitationError,
} from "./accept-invitation.dal";

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
      message: "Ton mot de passe a été enregistré. Tu peux te connecter.",
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.flatten().fieldErrors;

      return {
        status: "error",
        message: errors.token?.length
          ? "Le lien d’invitation est invalide."
          : "Vérifie les informations saisies.",
        fieldErrors: {
          password: errors.password,
          confirmPassword: errors.confirmPassword,
        },
      };
    }

    if (error instanceof InvalidInvitationError) {
      return {
        status: "error",
        message: error.message,
      };
    }

    // Ne journalise ni le formulaire ni le jeton.
    throw error;
  }
}
"use server";

import { AuthError } from "next-auth";

import { signIn, signOut } from "@/server/auth";

export type LoginState = {
  error: string | null;
};

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });

    return { error: null };
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return {
          error: "Email ou mot de passe incorrect.",
        };
      }

      return {
        error: "Connexion indisponible. Réessaie dans quelques instants.",
      };
    }

    // Une redirection Next.js doit continuer à se propager.
    throw error;
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({
    redirectTo: "/login",
  });
}
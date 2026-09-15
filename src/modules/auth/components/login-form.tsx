"use client";

import { useActionState } from "react";

import {
  loginAction,
  type LoginState,
} from "@/modules/auth/server/auth.actions";

const initialState: LoginState = {
  error: null,
};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium">
          Adresse e-mail
        </label>

        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          maxLength={254}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium">
          Mot de passe
        </label>

        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          maxLength={72}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
      </div>

      <div aria-live="polite">
        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-gray-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Connexion en cours…" : "Se connecter"}
      </button>
    </form>
  );
}
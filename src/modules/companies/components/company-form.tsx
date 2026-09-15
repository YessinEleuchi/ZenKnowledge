"use client";

import { useActionState } from "react";

import {
  createCompanyAction,
} from "../server/company.actions";
import { CreateCompanyState } from "../company.types";

const initialState: CreateCompanyState = {
  status: "idle",
  message: "",
};

export function CompanyForm() {
  const [state, formAction, pending] = useActionState(
    createCompanyAction,
    initialState,
  );

  const nameErrors = state.fieldErrors?.nom;

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <label
          htmlFor="company-name"
          className="block text-sm font-medium"
        >
          Nom de la société
        </label>

        <input
          id="company-name"
          name="nom"
          type="text"
          required
          minLength={2}
          maxLength={150}
          placeholder="Ex. ZEN Group"
          aria-invalid={Boolean(nameErrors?.length)}
          aria-describedby={
            nameErrors?.length ? "company-name-error" : undefined
          }
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />

        {nameErrors?.length ? (
          <p
            id="company-name-error"
            className="text-sm text-red-600"
          >
            {nameErrors[0]}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-gray-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Création en cours…" : "Créer la société"}
      </button>

      <div aria-live="polite" aria-atomic="true">
        {state.message && (
          <p
            className={
              state.status === "success"
                ? "text-sm text-green-700"
                : "text-sm text-red-600"
            }
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
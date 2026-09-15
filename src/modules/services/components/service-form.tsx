"use client";

import { useActionState } from "react";

import {
  createServiceAction,
  type CreateServiceState,
} from "../server/service.actions";

const initialState: CreateServiceState = {
  status: "idle",
  message: "",
};

type ServiceFormProps = {
  companyId: string;
};

export function ServiceForm({ companyId }: ServiceFormProps) {
  const [state, formAction, pending] = useActionState(
    createServiceAction,
    initialState,
  );

  const nameErrors = state.fieldErrors?.nom;

  return (
    <form action={formAction} className="space-y-4">
      <input
        type="hidden"
        name="societeId"
        value={companyId}
      />

      <div className="space-y-2">
        <label
          htmlFor="service-name"
          className="block text-sm font-medium"
        >
          Nom du service
        </label>

        <input
          id="service-name"
          name="nom"
          type="text"
          required
          minLength={2}
          maxLength={150}
          placeholder="Ex. Ressources humaines"
          aria-invalid={Boolean(nameErrors?.length)}
          aria-describedby={
            nameErrors?.length ? "service-name-error" : undefined
          }
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />

        {nameErrors?.length ? (
          <p
            id="service-name-error"
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
        {pending ? "Création en cours…" : "Ajouter le service"}
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
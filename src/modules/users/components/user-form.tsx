"use client";

import { useActionState, useRef } from "react";

import { createUserAction } from "../server/user.actions";
import type {
  CreateUserState,
  UserCreationOptions,
  UserField,
} from "../user.types";

const initialState: CreateUserState = {
  status: "idle",
  message: "",
};

export function UserForm({
  options,
}: {
  options: UserCreationOptions;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, action, pending] = useActionState(
    async (previous: CreateUserState, formData: FormData) => {
      const result = await createUserAction(previous, formData);

      if (result.status === "success") {
        formRef.current?.reset();
      }

      return result;
    },
    initialState,
  );

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2";

  function errorProps(field: UserField) {
    const invalid = Boolean(state.fieldErrors?.[field]?.length);

    return {
      "aria-invalid": invalid,
      "aria-describedby": invalid ? `${field}-error` : undefined,
    };
  }

  function fieldError(field: UserField) {
    const message = state.fieldErrors?.[field]?.[0];

    return message ? (
      <p id={`${field}-error`} className="text-sm text-red-600">
        {message}
      </p>
    ) : null;
  }

  if (
    options.mode === "GESTIONNAIRE" &&
    options.companies.length === 0
  ) {
    return <p>Crée d’abord une société.</p>;
  }

  if (
    options.mode === "COLLABORATEUR" &&
    options.services.length === 0
  ) {
    return (
      <p>
        Aucun service n’est disponible dans ta société.
        Un service doit être créé avant d’ajouter un collaborateur.
      </p>
    );
  }

  return (
    <form ref={formRef} action={action} className="space-y-5">
      <p className="text-sm text-gray-600">
        {options.mode === "GESTIONNAIRE"
          ? "Le compte créé aura le rôle Gestionnaire."
          : `Nouveau collaborateur pour ${options.company.nom}.`}
      </p>

      <fieldset
        disabled={pending}
        className="grid gap-5 disabled:opacity-60 md:grid-cols-2"
      >
        <div className="space-y-2">
          <label htmlFor="nom" className="block text-sm font-medium">
            Nom
          </label>
          <input
            id="nom"
            name="nom"
            required
            minLength={2}
            maxLength={150}
            className={inputClass}
            {...errorProps("nom")}
          />
          {fieldError("nom")}
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium">
            Adresse e-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="off"
            required
            maxLength={254}
            className={inputClass}
            {...errorProps("email")}
          />
          {fieldError("email")}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium">
            Mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={72}
            className={inputClass}
            {...errorProps("password")}
          />
          <p className="text-xs text-gray-500">
            Au moins 12 caractères.
          </p>
          {fieldError("password")}
        </div>

        {options.mode === "GESTIONNAIRE" ? (
          <div className="space-y-2">
            <label
              htmlFor="societeId"
              className="block text-sm font-medium"
            >
              Société
            </label>
            <select
              id="societeId"
              name="societeId"
              defaultValue=""
              required
              className={inputClass}
              {...errorProps("societeId")}
            >
              <option value="">Sélectionner une société</option>
              {options.companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.nom}
                </option>
              ))}
            </select>
            {fieldError("societeId")}
          </div>
        ) : (
          <div className="space-y-2">
            <label
              htmlFor="serviceId"
              className="block text-sm font-medium"
            >
              Service
            </label>
            <select
              id="serviceId"
              name="serviceId"
              defaultValue=""
              required
              className={inputClass}
              {...errorProps("serviceId")}
            >
              <option value="">Sélectionner un service</option>
              {options.services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.nom}
                </option>
              ))}
            </select>
            {fieldError("serviceId")}
          </div>
        )}

        <div className="md:col-span-2">
          <button
            type="submit"
            className="rounded-lg bg-gray-900 px-4 py-2 text-white"
          >
            {pending
              ? "Création en cours…"
              : options.mode === "GESTIONNAIRE"
                ? "Créer le gestionnaire"
                : "Créer le collaborateur"}
          </button>
        </div>
      </fieldset>

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
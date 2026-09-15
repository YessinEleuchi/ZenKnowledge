"use client";

import { useActionState, useRef, useState } from "react";
import { CircleAlert, Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fieldClassName,
  labelClassName,
  errorClassName,
  SubmitButton,
  FormFeedback,
} from "@/components/forms/form-ui";

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
  const [showPassword, setShowPassword] = useState(false);

  const [state, action, pending] = useActionState(
    async (previous: CreateUserState, formData: FormData) => {
      const result = await createUserAction(previous, formData);

      if (result.status === "success") {
        formRef.current?.reset();
        setShowPassword(false);
      }

      return result;
    },
    initialState,
  );

  function errorProps(field: UserField) {
    const invalid = Boolean(state.fieldErrors?.[field]?.length);

    const descriptions = [
      field === "password" ? "user-password-hint" : undefined,
      invalid ? `user-${field}-error` : undefined,
    ]
      .filter(Boolean)
      .join(" ");

    return {
      "aria-invalid": invalid,
      "aria-describedby": descriptions || undefined,
    };
  }

  function fieldError(field: UserField) {
    const message = state.fieldErrors?.[field]?.[0];

    return message ? (
      <p id={`user-${field}-error`} className={errorClassName}>
        {message}
      </p>
    ) : null;
  }

  const unavailableMessage =
    options.mode === "GESTIONNAIRE" && options.companies.length === 0
      ? "Créez d’abord une société depuis la page Sociétés pour pouvoir lui affecter un gestionnaire."
      : options.mode === "COLLABORATEUR" && options.services.length === 0
        ? "Aucun service n’est disponible dans votre société. Contactez l’administrateur pour créer un service avant d’ajouter un collaborateur."
        : null;

  if (unavailableMessage) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-[#E5D9BC] bg-[#FBF7ED] p-4">
        <CircleAlert
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-[#806633]"
        />
        <p className="text-sm leading-6 text-[#705B32]">
          {unavailableMessage}
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={action}
      aria-busy={pending}
      className="space-y-5"
    >
      <p className="border-l-2 border-[#B9CDB1] pl-3 text-sm leading-6 text-[#526A5E]">
        {options.mode === "GESTIONNAIRE"
          ? "Le compte créé aura le rôle Gestionnaire."
          : `Le compte sera rattaché à ${options.company.nom}.`}
      </p>

      <fieldset
        disabled={pending}
        className="grid min-w-0 gap-5 disabled:opacity-60 md:grid-cols-2"
      >
        <legend className="sr-only">
          Informations du nouveau compte
        </legend>

        <div className="space-y-2">
          <Label htmlFor="user-nom" className={labelClassName}>
            Nom complet
          </Label>

          <Input
            id="user-nom"
            name="nom"
            type="text"
            autoComplete="off"
            placeholder="Prénom et nom"
            required
            minLength={2}
            maxLength={150}
            className={fieldClassName}
            {...errorProps("nom")}
          />

          {fieldError("nom")}
        </div>

        <div className="space-y-2">
          <Label htmlFor="user-email" className={labelClassName}>
            Adresse e-mail
          </Label>

          <Input
            id="user-email"
            name="email"
            type="email"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="prenom.nom@entreprise.com"
            required
            maxLength={254}
            className={fieldClassName}
            {...errorProps("email")}
          />

          {fieldError("email")}
        </div>

        <div className="space-y-2">
          <Label htmlFor="user-password" className={labelClassName}>
            Mot de passe
          </Label>

          <div className="relative">
            <Input
              id="user-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={72}
              className={`${fieldClassName} pr-12`}
              {...errorProps("password")}
            />

            <button
              type="button"
              disabled={pending}
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={
                showPassword
                  ? "Masquer le mot de passe"
                  : "Afficher le mot de passe"
              }
              aria-controls="user-password"
              className="absolute inset-y-0 right-0 flex w-11
                items-center justify-center rounded-r-lg text-[#65716A]
                hover:bg-[#F0F3EF] hover:text-[#285448]
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-inset focus-visible:ring-[#285448]"
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" className="size-4" />
              ) : (
                <Eye aria-hidden="true" className="size-4" />
              )}
            </button>
          </div>

          <p
            id="user-password-hint"
            className="text-xs leading-5 text-[#65716A]"
          >
            Au moins 12 caractères.
          </p>

          {fieldError("password")}
        </div>

        {options.mode === "GESTIONNAIRE" ? (
          <div className="space-y-2">
            <Label htmlFor="user-societeId" className={labelClassName}>
              Société
            </Label>

            <select
              id="user-societeId"
              name="societeId"
              defaultValue=""
              required
              className={fieldClassName}
              {...errorProps("societeId")}
            >
              <option value="" disabled>
                Sélectionner une société
              </option>

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
            <Label htmlFor="user-serviceId" className={labelClassName}>
              Service
            </Label>

            <select
              id="user-serviceId"
              name="serviceId"
              defaultValue=""
              required
              className={fieldClassName}
              {...errorProps("serviceId")}
            >
              <option value="" disabled>
                Sélectionner un service
              </option>

              {options.services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.nom}
                </option>
              ))}
            </select>

            {fieldError("serviceId")}
          </div>
        )}
      </fieldset>

      <div className="border-t border-[#E8ECE6] pt-5">
        <SubmitButton
          pending={pending}
          label={
            options.mode === "GESTIONNAIRE"
              ? "Créer le gestionnaire"
              : "Créer le collaborateur"
          }
        />
      </div>

      <FormFeedback
        message={state.message}
        success={state.status === "success"}
      />
    </form>
  );
}
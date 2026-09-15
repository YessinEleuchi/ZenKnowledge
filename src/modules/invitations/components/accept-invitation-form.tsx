"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fieldClassName,
  labelClassName,
  errorClassName,
  SubmitButton,
  FormFeedback,
} from "@/components/forms/form-ui";

import { acceptInvitationAction } from "../server/accept-invitation.actions";
import type {
  AcceptInvitationField,
  AcceptInvitationState,
} from "../invitation.types";

const initialState: AcceptInvitationState = {
  status: "idle",
  message: "",
};

export function AcceptInvitationForm({ token }: { token: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const [state, action, pending] = useActionState(
    acceptInvitationAction,
    initialState,
  );

  if (state.status === "success") {
    return (
      <div className="space-y-6">
        <div role="status">
          <FormFeedback message={state.message} success />
        </div>

        <Link
          href="/login"
          className="flex min-h-11 items-center justify-center rounded-lg
            bg-[#285448] px-4 py-3 text-sm font-semibold text-white
            hover:bg-[#1E4238] focus-visible:outline-none
            focus-visible:ring-2 focus-visible:ring-[#285448]
            focus-visible:ring-offset-2"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  const fields: {
    name: AcceptInvitationField;
    label: string;
  }[] = [
    { name: "password", label: "Mot de passe" },
    { name: "confirmPassword", label: "Confirmer le mot de passe" },
  ];

  return (
    <form action={action} aria-busy={pending} className="space-y-6">
      <input type="hidden" name="token" value={token} />

      <fieldset disabled={pending} className="space-y-5 disabled:opacity-60">
        <legend className="sr-only">Définir ton mot de passe</legend>

        {fields.map(({ name, label }) => {
          const error = state.fieldErrors?.[name]?.[0];

          const describedBy = [
            name === "password" ? "invitation-password-hint" : undefined,
            error ? `invitation-${name}-error` : undefined,
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div key={name} className="space-y-2">
              <Label
                htmlFor={`invitation-${name}`}
                className={labelClassName}
              >
                {label}
              </Label>

              <Input
                id={`invitation-${name}`}
                name={name}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={72}
                className={fieldClassName}
                aria-invalid={Boolean(error)}
                aria-describedby={describedBy || undefined}
              />

              {name === "password" && (
                <p
                  id="invitation-password-hint"
                  className="text-xs leading-5 text-[#65716A]"
                >
                  Au moins 12 caractères. Choisis un mot de passe
                  réservé à ce compte.
                </p>
              )}

              {error && (
                <p
                  id={`invitation-${name}-error`}
                  className={errorClassName}
                >
                  {error}
                </p>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => setShowPassword((visible) => !visible)}
          aria-pressed={showPassword}
          aria-controls="invitation-password invitation-confirmPassword"
          className="flex items-center gap-2 rounded text-sm
            text-[#285448] focus-visible:outline-none
            focus-visible:ring-2 focus-visible:ring-[#285448]"
        >
          {showPassword ? (
            <EyeOff aria-hidden="true" className="size-4" />
          ) : (
            <Eye aria-hidden="true" className="size-4" />
          )}

          {showPassword
            ? "Masquer les mots de passe"
            : "Afficher les mots de passe"}
        </button>
      </fieldset>

      <SubmitButton
        pending={pending}
        label="Enregistrer mon mot de passe"
      />

      <div aria-live="polite">
        <FormFeedback message={state.message} success={false} />
      </div>
    </form>
  );
}
"use client";

import { useActionState, useState } from "react";
import { CircleAlert, Eye, EyeOff, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  loginAction,
  type LoginState,
} from "@/modules/auth/server/auth.actions";

const initialState: LoginState = {
  error: null,
};

const inputClassName =
  "h-12 rounded-lg border-[#CDD5CE] bg-white px-3.5 " +
  "text-base text-[#202923] shadow-none " +
  "placeholder:text-[#8A938D] " +
  "focus-visible:border-[#285448] " +
  "focus-visible:ring-[3px] focus-visible:ring-[#285448]/15 " +
  "disabled:opacity-60 md:text-sm";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      aria-busy={pending}
      className="space-y-5"
    >
      <div className="space-y-2">
        <Label
          htmlFor="email"
          className="text-sm font-medium text-[#35473D]"
        >
          Adresse e-mail
        </Label>

        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="prenom.nom@entreprise.com"
          maxLength={254}
          readOnly={pending}
          required
          className={inputClassName}
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="password"
          className="text-sm font-medium text-[#35473D]"
        >
          Mot de passe
        </Label>

        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            maxLength={72}
            readOnly={pending}
            required
            className={`${inputClassName} pr-12`}
          />

          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={
              showPassword
                ? "Masquer le mot de passe"
                : "Afficher le mot de passe"
            }
            aria-controls="password"
            disabled={pending}
            className="absolute inset-y-1 right-1 flex w-10 items-center
              justify-center rounded-md text-[#65716A]
              transition-colors hover:bg-[#F0F3EF] hover:text-[#285448]
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-[#285448] disabled:opacity-50"
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" className="size-4" />
            ) : (
              <Eye aria-hidden="true" className="size-4" />
            )}
          </button>
        </div>
      </div>

      <div aria-live="polite" aria-atomic="true">
        {state.error && (
          <div
            className="flex items-start gap-2.5 rounded-lg
              border border-[#EACCC7] bg-[#FFF5F3] p-3
              text-sm leading-5 text-[#963F32]"
          >
            <CircleAlert
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0"
            />
            <p>{state.error}</p>
          </div>
        )}
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-lg bg-[#285448]
          text-sm font-medium text-white shadow-none
          transition-colors hover:bg-[#1E4238]
          focus-visible:ring-[3px] focus-visible:ring-[#285448]/25
          disabled:opacity-65"
      >
        {pending && (
          <LoaderCircle
            aria-hidden="true"
            className="size-4 animate-spin"
          />
        )}
        {pending ? "Connexion en cours…" : "Se connecter"}
      </Button>
    </form>
  );
}
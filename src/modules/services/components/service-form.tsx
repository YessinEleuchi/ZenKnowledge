"use client";

import { useActionState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fieldClassName,
  labelClassName,
  errorClassName,
  SubmitButton,
  FormFeedback,
} from "@/components/forms/form-ui";

import { createServiceAction } from "../server/service.actions";
import type { CreateServiceState } from "../service.types";

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

  const nameError = state.fieldErrors?.nom?.[0];

  return (
    <form
      action={formAction}
      aria-busy={pending}
      className="max-w-xl space-y-5"
    >
      <input type="hidden" name="societeId" value={companyId} />

      <div className="space-y-2">
        <Label htmlFor="service-name" className={labelClassName}>
          Nom du service
        </Label>

        <Input
          id="service-name"
          name="nom"
          type="text"
          required
          minLength={2}
          maxLength={150}
          readOnly={pending}
          placeholder="Ex. Ressources humaines"
          aria-invalid={Boolean(nameError)}
          aria-describedby={
            nameError ? "service-name-error" : undefined
          }
          className={fieldClassName}
        />

        {nameError && (
          <p id="service-name-error" className={errorClassName}>
            {nameError}
          </p>
        )}
      </div>

      <SubmitButton pending={pending} label="Ajouter le service" />

      <FormFeedback
        message={state.message}
        success={state.status === "success"}
      />
    </form>
  );
}
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

import { createCompanyAction } from "../server/company.actions";
import type { CreateCompanyState } from "../company.types";

const initialState: CreateCompanyState = {
  status: "idle",
  message: "",
};

export function CompanyForm() {
  const [state, formAction, pending] = useActionState(
    createCompanyAction,
    initialState,
  );

  const nameError = state.fieldErrors?.nom?.[0];

  return (
    <form
      action={formAction}
      aria-busy={pending}
      className="max-w-xl space-y-5"
    >
      <div className="space-y-2">
        <Label htmlFor="company-name" className={labelClassName}>
          Nom de la société
        </Label>

        <Input
          id="company-name"
          name="nom"
          type="text"
          required
          minLength={2}
          maxLength={150}
          readOnly={pending}
          placeholder="Ex. ZEN Group"
          aria-invalid={Boolean(nameError)}
          aria-describedby={
            nameError ? "company-name-error" : undefined
          }
          className={fieldClassName}
        />

        {nameError && (
          <p id="company-name-error" className={errorClassName}>
            {nameError}
          </p>
        )}
      </div>

      <SubmitButton pending={pending} label="Créer la société" />

      <FormFeedback
        message={state.message}
        success={state.status === "success"}
      />
    </form>
  );
}
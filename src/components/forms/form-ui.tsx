import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export const fieldClassName =
  "h-11 w-full rounded-lg border border-[#CDD5CE] bg-white px-3 " +
  "text-base text-[#202923] shadow-none md:text-sm " +
  "placeholder:text-[#8A938D] " +
  "focus-visible:outline-none focus-visible:border-[#285448] " +
  "focus-visible:ring-[3px] focus-visible:ring-[#285448]/15 " +
  "aria-invalid:border-[#B85C4A] aria-invalid:ring-[#B85C4A]/15 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export const labelClassName =
  "text-sm font-medium text-[#35473D]";

export const errorClassName =
  "text-xs leading-5 text-[#963F32]";

export function SubmitButton({
  pending,
  label,
}: {
  pending: boolean;
  label: string;
}) {
  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-11 w-full rounded-lg bg-[#285448] px-5
        text-sm font-medium text-white shadow-none
        hover:bg-[#1E4238] focus-visible:ring-[3px]
        focus-visible:ring-[#285448]/25 disabled:opacity-65 sm:w-auto"
    >
      {pending && (
        <LoaderCircle
          aria-hidden="true"
          className="size-4 animate-spin"
        />
      )}
      {pending ? "Création en cours…" : label}
    </Button>
  );
}

export function FormFeedback({
  message,
  success,
}: {
  message: string;
  success: boolean;
}) {
  const Icon = success ? CheckCircle2 : CircleAlert;

  return (
    <div aria-live="polite" aria-atomic="true">
      {message && (
        <div
          className={`flex items-start gap-2.5 rounded-lg border p-3 text-sm leading-6 ${
            success
              ? "border-[#D4E3CD] bg-[#F0F6ED] text-[#365C3D]"
              : "border-[#EACCC7] bg-[#FFF5F3] text-[#963F32]"
          }`}
        >
          <Icon
            aria-hidden="true"
            className="mt-1 size-4 shrink-0"
          />
          <p>{message}</p>
        </div>
      )}
    </div>
  );
}
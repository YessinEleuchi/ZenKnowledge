export type AcceptInvitationField =
  | "password"
  | "confirmPassword";

export type AcceptInvitationState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: Partial<Record<AcceptInvitationField, string[]>>;
};
import type { z } from "zod";

import type { Role } from "@/types/enums";
import type { ActionState } from "@/types/action-state";
import type {
  userIdentitySchema,
  createManagerSchema,
  createCollaboratorSchema,
} from "./user.schema";

export type UserIdentityInput = z.infer<typeof userIdentitySchema>;

export type CreateManagerInput = z.infer<
  typeof createManagerSchema
>;

export type CreateCollaboratorInput = z.infer<
  typeof createCollaboratorSchema
>;

export type UserField =
  | keyof CreateManagerInput
  | keyof CreateCollaboratorInput;

export type CreateUserState = ActionState<UserField>;

export type OrganizationOption = {
  id: string;
  nom: string;
};

export type UserCreationOptions =
  | {
      mode: typeof Role.GESTIONNAIRE;
      companies: OrganizationOption[];
    }
  | {
      mode: typeof Role.COLLABORATEUR;
      company: OrganizationOption;
      services: OrganizationOption[];
    };
import { Role } from "@/types/enums";

export const ROLE_LABELS = {
  [Role.ADMIN]: "Administrateur",
  [Role.GESTIONNAIRE]: "Gestionnaire",
  [Role.COLLABORATEUR]: "Collaborateur",
} satisfies Record<Role, string>;
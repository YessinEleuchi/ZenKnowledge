import type { Role } from "@/types/enums";

export type CurrentUser = {
  id: string;
  nom: string;
  email: string;
  role: Role;
  societeId: string | null;
  serviceId: string | null;
};

export type AdminUser = CurrentUser & {
  role: typeof Role.ADMIN;
};

export type CompanyManagerUser = CurrentUser & {
  role: typeof Role.GESTIONNAIRE;
  societeId: string;
};

export type UserManager = AdminUser | CompanyManagerUser;
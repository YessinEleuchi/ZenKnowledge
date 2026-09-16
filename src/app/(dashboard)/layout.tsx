import type { CSSProperties, ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/layout/app-sidebar";
import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ROLE_LABELS } from "@/modules/users/user.constants";
import { getCurrentUser } from "@/server/auth/session";
import { Role } from "@/types/enums";

const workspaceTheme = {
  "--sidebar-width": "16rem",
  "--sidebar": "#F4F6F1",
  "--sidebar-foreground": "#243E35",
  "--sidebar-border": "#DDE3DC",
  "--sidebar-accent": "#E5ECE3",
  "--sidebar-accent-foreground": "#243E35",
  "--sidebar-primary": "#285448",
  "--sidebar-primary-foreground": "#FFFFFF",
  "--sidebar-ring": "#285448",
} as CSSProperties;

export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

const canManageCompanies =
  user.role === Role.ADMIN;

const canManageUsers =
  user.role === Role.ADMIN ||
  user.role === Role.GESTIONNAIRE;

const canConsultDocuments =
  Boolean(user.societeId) &&
  (
    user.role === Role.GESTIONNAIRE ||
    user.role === Role.COLLABORATEUR
  );

const canUseChat =
  Boolean(user.societeId) &&
  (
    user.role === Role.GESTIONNAIRE ||
    user.role === Role.COLLABORATEUR
  );

  return (
    <SidebarProvider style={workspaceTheme}>
      <a
        href="#workspace-content"
        className="sr-only fixed left-4 top-4 z-50 rounded-md
          bg-white p-3 text-sm text-[#243E35] shadow
          focus:not-sr-only"
      >
        Aller au contenu
      </a>

      <AppSidebar
  user={{
    nom: user.nom,
    email: user.email,
    roleLabel: ROLE_LABELS[user.role],
  }}
  canManageCompanies={canManageCompanies}
  canManageUsers={canManageUsers}
  canConsultDocuments={canConsultDocuments}
  canUseChat={canUseChat}
/>

      <div className="flex min-h-svh min-w-0 flex-1 flex-col bg-[#F7F8F5] text-[#202923]">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-[#DDE3DC] bg-[#F7F8F5] px-4 sm:px-5 lg:px-6">
          <SidebarTrigger
            aria-label="Ouvrir ou fermer la navigation"
            title="Ouvrir ou fermer la navigation"
            className="text-[#526A5E]"
          />

          <span
            aria-hidden="true"
            className="h-5 w-px bg-[#DDE3DC]"
          />

          <span className="text-sm font-medium text-[#526A5E]">
            Espace de travail
          </span>

          <span className="ml-auto hidden text-xs text-[#65716A] sm:block">
            {ROLE_LABELS[user.role]}
          </span>
        </header>

        <main
  id="workspace-content"
  tabIndex={-1}
  className="mx-auto w-full max-w-7xl flex-1 p-4 outline-none sm:p-5 lg:p-6"
>
  {children}
</main>
      </div>
    </SidebarProvider>
  );
}
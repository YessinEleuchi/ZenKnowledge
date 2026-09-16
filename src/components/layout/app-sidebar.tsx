"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  Activity,
  Building2,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  MessageCircle,
  Users,
} from "lucide-react";

import { logoutAction } from "@/modules/auth/server/auth.actions";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  user: {
    nom: string;
    email: string;
    roleLabel: string;
  };
  canManageUsers: boolean;
  canManageCompanies: boolean;
  canConsultDocuments: boolean;
  canUseChat: boolean;
  canViewObservability : boolean;
};

function LogoutButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex min-h-11 w-full items-center gap-3 rounded-lg
        px-3 py-2 text-sm text-[#59675E] transition-colors
        hover:bg-[#E5ECE3] hover:text-[#243E35]
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-[#285448]
        disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? (
        <LoaderCircle
          aria-hidden="true"
          className="size-[18px] shrink-0 animate-spin"
        />
      ) : (
        <LogOut
          aria-hidden="true"
          className="size-[18px] shrink-0"
          strokeWidth={1.7}
        />
      )}

      <span aria-live="polite">
        {pending ? "Déconnexion…" : "Se déconnecter"}
      </span>
    </button>
  );
}

export function AppSidebar({
  user,
  canManageUsers,
  canManageCompanies,
  canConsultDocuments,
  canUseChat,
  canViewObservability,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

const items = [
  {
    title: "Vue d’ensemble",
    href: "/dashboard",
    icon: LayoutDashboard,
    visible: true,
  },
  {
    title: "Documents",
    href: "/documents",
    icon: FileText,
    visible: canConsultDocuments,
  },
  {
    title: "Assistant",
    href: "/chat",
    icon: MessageCircle,
    visible: canUseChat,
  },
  {
    title: "Sociétés",
    href: "/companies",
    icon: Building2,
    visible: canManageCompanies,
  },
  {
    title: "Utilisateurs",
    href: "/users",
    icon: Users,
    visible: canManageUsers,
  },
  {
  title: "Observabilité",
  href: "/observability",
  icon: Activity,
  visible: canViewObservability,
},
].filter((item) => item.visible);

  const initials =
    user.nom
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U";

  function closeMobileSidebar() {
    if (isMobile) {
      setOpenMobile(false);
    }
  }

  return (
    <Sidebar
      collapsible="offcanvas"
      className="border-r border-[#DDE3DC]"
    >
      <SidebarHeader className="gap-0 p-0">
        <div className="flex h-16 items-center border-b border-[#DDE3DC] px-5">
          <Link
            href="/dashboard"
            aria-label="ZEN Knowledge — Accueil"
            onClick={closeMobileSidebar}
            className="flex min-h-11 items-center gap-3 rounded-md
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-[#285448]"
          >
            <Image
              src="/images/zen.png"
              alt="ZEN"
              width={80}
              height={40}
              priority
              className="h-7 w-auto max-w-20 object-contain"
            />

            <span
              aria-hidden="true"
              className="h-5 w-px bg-[#DDE3DC]"
            />

            <span className="text-sm font-semibold tracking-tight text-[#243E35]">
              Knowledge
            </span>
          </Link>
        </div>

        <p className="px-5 pb-2 pt-5 text-[11px] font-medium uppercase tracking-[0.08em] text-[#65716A]">
          {canManageCompanies
            ? "Administration générale"
            : "Mon organisation"}
        </p>
      </SidebarHeader>

      <SidebarContent className="px-3 py-1">
        <nav aria-label="Navigation principale">
          <ul className="space-y-1">
            {items.map((item) => {
              const active =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={closeMobileSidebar}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-lg",
                      "px-3 py-2 text-sm transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2",
                      "focus-visible:ring-[#285448]",
                      active
                        ? "bg-[#E5ECE3] font-semibold text-[#243E35]"
                        : "text-[#59675E] hover:bg-[#EDF1EB] hover:text-[#243E35]",
                    )}
                  >
                    <Icon
                      aria-hidden="true"
                      className="size-[18px] shrink-0"
                      strokeWidth={1.7}
                    />

                    <span>{item.title}</span>

                    {active && (
                      <span
                        aria-hidden="true"
                        className="ml-auto size-1.5 rounded-full bg-[#285448]"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </SidebarContent>

      <SidebarFooter className="gap-2 border-t border-[#DDE3DC] p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center
              rounded-full bg-[#E5ECE3] text-xs font-semibold text-[#285448]"
          >
            {initials}
          </div>

          <div className="min-w-0">
            <p
              className="truncate text-sm font-medium text-[#243E35]"
              title={user.nom}
            >
              {user.nom}
            </p>

            <p
              className="mt-0.5 truncate text-xs text-[#65716A]"
              title={user.email}
            >
              {user.email}
            </p>
          </div>
        </div>

        <form action={logoutAction}>
          <LogoutButton />
        </form>
      </SidebarFooter>
    </Sidebar>
  );
}
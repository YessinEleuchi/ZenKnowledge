"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, Users } from "lucide-react";

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
};

export function AppSidebar({
  user,
  canManageUsers,
  canManageCompanies,
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
      <SidebarHeader className="gap-0 p-6">
        <Link
          href="/dashboard"
          aria-label="ZEN Knowledge — Accueil"
          onClick={closeMobileSidebar}
          className="flex items-center gap-3 rounded-md
            focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-[#285448]"
        >
          <Image
            src="/images/zen.png"
            alt="ZEN"
            width={80}
            height={40}
            priority
            className="h-8 w-auto max-w-20 object-contain"
          />

          <span className="h-7 w-px bg-[#DDE3DC]" />

          <span className="text-sm font-semibold tracking-tight text-[#243E35]">
            Knowledge
          </span>
        </Link>

        <div className="mt-7 border-t border-[#DDE3DC] pt-5">
          <p className="text-xs text-[#65716A]">Espace de travail</p>
          <p className="mt-1 text-sm font-medium text-[#243E35]">
            {canManageCompanies
              ? "Administration générale"
              : "Mon organisation"}
          </p>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-2">
        <nav aria-label="Navigation principale">
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#65716A]">
            Navigation
          </p>

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
                      "px-3 py-2.5 text-sm transition-colors",
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

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3 border-t border-[#DDE3DC] pt-4">
          <div
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center
              rounded-full bg-[#E5ECE3] text-xs font-semibold text-[#285448]"
          >
            {initials}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#243E35]">
              {user.nom}
            </p>
            <p className="truncate text-xs text-[#65716A]" title={user.email}>
              {user.email}
            </p>
            <p className="mt-1 text-[11px] font-medium text-[#526A5E]">
              {user.roleLabel}
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
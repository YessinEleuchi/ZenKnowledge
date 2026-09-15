import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Building2, Users } from "lucide-react";

import { getCurrentUser } from "@/server/auth/session";
import { ROLE_LABELS } from "@/modules/users/user.constants";
import { Role } from "@/types/enums";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const isAdmin = user.role === Role.ADMIN;
  const canManageUsers = user.role !== Role.COLLABORATEUR;

  const shortcuts = [
    {
      title: "Sociétés et services",
      description:
        "Organisez les sociétés et consultez leurs services.",
      href: "/companies",
      icon: Building2,
      visible: isAdmin,
    },
    {
      title: "Utilisateurs",
      description: isAdmin
        ? "Créez les gestionnaires et affectez-les à une société."
        : "Créez les collaborateurs de votre société et gérez leurs affectations.",
      href: "/users",
      icon: Users,
      visible: canManageUsers,
    },
  ].filter((item) => item.visible);

  const firstName = user.nom.trim().split(/\s+/)[0];

  return (
    <div className="space-y-10">
      <header className="border-b border-[#DDE3DC] pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#65716A]">
          Vue d’ensemble
        </p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Bonjour{firstName ? `, ${firstName}` : ""}.
        </h1>

        <p className="mt-3 max-w-xl text-sm leading-6 text-[#65716A]">
          {isAdmin
            ? "Organisez les espaces de travail et les accès à ZEN Knowledge."
            : canManageUsers
              ? "Retrouvez les outils de gestion de votre équipe."
              : "Bienvenue dans votre espace ZEN Knowledge."}
        </p>
      </header>

      {shortcuts.length > 0 && (
        <section aria-labelledby="shortcuts-title">
          <h2
            id="shortcuts-title"
            className="text-lg font-semibold tracking-tight"
          >
            Gérer votre espace
          </h2>

          <p className="mt-1 text-sm text-[#65716A]">
            Les actions disponibles pour votre rôle.
          </p>

          <div className="mt-5 overflow-hidden rounded-xl border border-[#DDE3DC] bg-white">
            {shortcuts.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-4 border-b
                    border-[#E8ECE6] p-5 transition-colors last:border-b-0
                    hover:bg-[#F4F7F1] focus-visible:outline-none
                    focus-visible:ring-2 focus-visible:ring-inset
                    focus-visible:ring-[#285448] sm:p-6"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-[#DDE3DC] bg-[#F7F8F5] text-[#285448]">
                    <Icon
                      aria-hidden="true"
                      className="size-5"
                      strokeWidth={1.7}
                    />
                  </span>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-[#243E35]">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-[#65716A]">
                      {item.description}
                    </p>
                  </div>

                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-5 shrink-0 text-[#65716A] group-hover:text-[#285448]"
                  />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section
        aria-labelledby="account-title"
        className="max-w-2xl"
      >
        <h2
          id="account-title"
          className="text-lg font-semibold tracking-tight"
        >
          Votre compte
        </h2>

        <dl className="mt-4 divide-y divide-[#DDE3DC] text-sm">
          <div className="grid gap-1 py-4 sm:grid-cols-[160px_1fr] sm:gap-4">
            <dt className="text-[#65716A]">Nom complet</dt>
            <dd className="font-medium">{user.nom}</dd>
          </div>

          <div className="grid gap-1 py-4 sm:grid-cols-[160px_1fr] sm:gap-4">
            <dt className="text-[#65716A]">Adresse e-mail</dt>
            <dd className="break-words">{user.email}</dd>
          </div>

          <div className="grid gap-1 py-4 sm:grid-cols-[160px_1fr] sm:gap-4">
            <dt className="text-[#65716A]">Rôle</dt>
            <dd>{ROLE_LABELS[user.role]}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
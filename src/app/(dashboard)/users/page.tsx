import { Users } from "lucide-react";

import { requireUserManager } from "@/server/auth/session";
import { UserForm } from "@/modules/users/components/user-form";
import {
  listUsers,
  getUserCreationOptions,
} from "@/modules/users/server/user.dal";
import { Role } from "@/types/enums";
import { ROLE_LABELS } from "@/modules/users/user.constants";

export default async function UsersPage() {
  const actor = await requireUserManager();

  const [users, options] = await Promise.all([
    listUsers(),
    getUserCreationOptions(),
  ]);

  const isAdmin = actor.role === Role.ADMIN;

  return (
  <div className="space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#65716A]">
          Administration
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#202923]">
          Utilisateurs
        </h1>
      </div>

      <span className="pb-0.5 text-sm text-[#65716A]">
        {users.length} compte{users.length > 1 ? "s" : ""}
      </span>
    </header>

    <section
      aria-labelledby="create-user-title"
      className="overflow-hidden rounded-xl border border-[#DDE3DC] bg-white"
    >
      <div className="border-b border-[#E8ECE6] px-4 py-4 sm:px-5">
        <h2
          id="create-user-title"
          className="text-sm font-semibold text-[#243E35]"
        >
          {isAdmin ? "Nouveau gestionnaire" : "Nouveau collaborateur"}
        </h2>
      </div>

      <div className="p-4 sm:p-5">
        <UserForm options={options} />
      </div>
    </section>

      <section
        aria-labelledby="users-title"
        className="min-w-0 overflow-hidden rounded-xl border border-[#DDE3DC] bg-white"
      >
        <div className="flex flex-wrap items-center gap-3 border-b border-[#DDE3DC] px-5 py-5 sm:px-6">
          <h2
            id="users-title"
            className="text-base font-semibold text-[#243E35]"
          >
            Comptes enregistrés
          </h2>

          <span className="rounded-md bg-[#EDF1EB] px-2 py-0.5 text-xs font-semibold tabular-nums text-[#526A5E]">
            {users.length}
          </span>
        </div>

        {users.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <Users
              aria-hidden="true"
              className="mb-4 size-7 text-[#65716A]"
              strokeWidth={1.5}
            />

            <p className="text-sm font-medium text-[#243E35]">
              Aucun compte enregistré
            </p>

            <p className="mt-2 max-w-sm text-sm leading-6 text-[#65716A]">
              Utilisez le formulaire ci-dessus pour créer votre premier
              {isAdmin ? " gestionnaire." : " collaborateur."}
            </p>
          </div>
        ) : (
          <div
            role="region"
            aria-labelledby="users-title"
            tabIndex={0}
            className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#285448]"
          >
            <table className="w-full min-w-[800px] text-left text-sm">
              <caption className="sr-only">
                Utilisateurs, affectations et statut des comptes
              </caption>

              <thead className="border-b border-[#DDE3DC] bg-[#F4F6F1] text-xs text-[#65716A]">
                <tr>
                  {[
                    "Utilisateur",
                    "Rôle",
                    "Société",
                    "Service",
                    "Statut",
                  ].map((label) => (
                    <th
                      key={label}
                      scope="col"
                      className="px-6 py-3.5 font-medium"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E8ECE6]">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-[#F8FAF6]"
                  >
                    <th
                      scope="row"
                      className="px-6 py-4 text-left font-normal"
                    >
                      <p className="font-medium text-[#243E35]">
                        {user.nom}
                      </p>
                      <p className="mt-1 text-xs text-[#65716A]">
                        {user.email}
                      </p>
                    </th>

                    <td className="px-6 py-4 text-[#526A5E]">
                      {ROLE_LABELS[user.role]}
                    </td>

                    <td className="px-6 py-4 text-[#526A5E]">
                      {user.societe?.nom ?? "—"}
                    </td>

                    <td className="px-6 py-4 text-[#526A5E]">
                      {user.service?.nom ?? "—"}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-2 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ${
                          user.actif
                            ? "bg-[#EAF2E8] text-[#365C3D]"
                            : "bg-[#F0F1EF] text-[#65716A]"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`size-1.5 rounded-full ${
                            user.actif ? "bg-[#527C4E]" : "bg-[#8A938D]"
                          }`}
                        />
                        {user.actif ? "Actif" : "Désactivé"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
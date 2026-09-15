import Link from "next/link";

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

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10 text-gray-900">
      <div className="mx-auto max-w-6xl space-y-8">
        <header>
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 hover:underline"
          >
            Retour au tableau de bord
          </Link>

          <h1 className="mt-4 text-3xl font-semibold">
            Utilisateurs
          </h1>

          <p className="mt-2 text-gray-600">
            Créez les comptes et affectez-les à une société.
          </p>
        </header>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-5 text-lg font-semibold">
  {actor.role === Role.ADMIN
    ? "Nouveau gestionnaire"
    : "Nouveau collaborateur"}
</h2>

<UserForm options={options} />
        </section>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <h2 className="border-b border-gray-200 p-6 text-lg font-semibold">
            Comptes enregistrés ({users.length})
          </h2>

          {users.length === 0 ? (
            <p className="p-6 text-gray-500">
              Aucun utilisateur.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    {[
                      "Nom",
                      "Email",
                      "Rôle",
                      "Société",
                      "Service",
                      "Statut",
                    ].map((label) => (
                      <th key={label} scope="col" className="px-5 py-3">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-5 py-4 font-medium">
                        {user.nom}
                      </td>
                      <td className="px-5 py-4">{user.email}</td>
                      <td className="px-5 py-4">
                        {ROLE_LABELS[user.role]}
                      </td>
                      <td className="px-5 py-4">
                        {user.societe?.nom ?? "—"}
                      </td>
                      <td className="px-5 py-4">
                        {user.service?.nom ?? "—"}
                      </td>
                      <td className="px-5 py-4">
                        {user.actif ? "Actif" : "Désactivé"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
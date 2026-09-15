import Link from "next/link";

import { CompanyForm } from "@/modules/companies/components/company-form";
import { listCompanies } from "@/modules/companies/server/company.dal";

export default async function CompaniesPage() {
  // listCompanies vérifie les droits avant de lire les données.
  const companies = await listCompanies();

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10 text-gray-900">
      <div className="mx-auto max-w-5xl space-y-8">
        <header>
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 hover:underline"
          >
            Retour au tableau de bord
          </Link>

          <h1 className="mt-4 text-3xl font-semibold">
            Sociétés
          </h1>

          <p className="mt-2 text-gray-600">
            Créez les sociétés qui utiliseront la plateforme.
          </p>
        </header>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">
            Nouvelle société
          </h2>

          <CompanyForm />
        </section>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <h2 className="border-b border-gray-200 p-6 text-lg font-semibold">
            Sociétés enregistrées ({companies.length})
          </h2>

          {companies.length === 0 ? (
            <p className="p-6 text-gray-500">
              Aucune société pour le moment.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th scope="col" className="px-6 py-3">
                      Nom
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Services
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Utilisateurs
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {companies.map((company) => (
                    <tr key={company.id}>
                      <td className="px-6 py-4 font-medium">
  <Link
    href={`/companies/${company.id}`}
    className="text-blue-700 hover:underline"
  >
    {company.nom}
  </Link>
</td>
                      <td className="px-6 py-4">
                        {company._count.services}
                      </td>
                      <td className="px-6 py-4">
                        {company._count.utilisateurs}
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
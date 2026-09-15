import Link from "next/link";
import { ArrowUpRight, Building2 } from "lucide-react";

import { CompanyForm } from "@/modules/companies/components/company-form";
import { listCompanies } from "@/modules/companies/server/company.dal";

export default async function CompaniesPage() {
  // Le DAL vérifie les droits avant de lire les données.
  const companies = await listCompanies();

  return (
    <div className="space-y-8">
      <header className="border-b border-[#DDE3DC] pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#65716A]">
          Administration
        </p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#202923]">
          Sociétés
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#65716A]">
          Organisez les sociétés de la plateforme et accédez à leurs services.
        </p>
      </header>

      <section
        aria-labelledby="create-company-title"
        className="grid gap-6 rounded-xl border border-[#DDE3DC] bg-white p-5 sm:p-6 xl:grid-cols-[240px_minmax(0,1fr)] xl:gap-10"
      >
        <div>
          <h2
            id="create-company-title"
            className="text-base font-semibold text-[#243E35]"
          >
            Nouvelle société
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#65716A]">
            Ajoutez une société, puis définissez ses services.
          </p>
        </div>

        <div className="min-w-0">
          <CompanyForm />
        </div>
      </section>

      <section
        aria-labelledby="companies-title"
        className="min-w-0 overflow-hidden rounded-xl border border-[#DDE3DC] bg-white"
      >
        <div className="flex flex-wrap items-center gap-3 border-b border-[#DDE3DC] px-5 py-5 sm:px-6">
          <h2
            id="companies-title"
            className="text-base font-semibold text-[#243E35]"
          >
            Sociétés enregistrées
          </h2>

          <span className="rounded-md bg-[#EDF1EB] px-2 py-0.5 text-xs font-semibold tabular-nums text-[#526A5E]">
            {companies.length}
          </span>
        </div>

        {companies.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <Building2
              aria-hidden="true"
              className="mb-4 size-7 text-[#65716A]"
              strokeWidth={1.5}
            />

            <p className="text-sm font-medium text-[#243E35]">
              Aucune société enregistrée
            </p>

            <p className="mt-2 max-w-sm text-sm leading-6 text-[#65716A]">
              Créez une première société avec le formulaire ci-dessus.
            </p>
          </div>
        ) : (
          <div
            role="region"
            aria-labelledby="companies-title"
            tabIndex={0}
            className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#285448]"
          >
            <table className="w-full min-w-[560px] text-left text-sm">
              <caption className="sr-only">
                Sociétés et nombre de services et d’utilisateurs
              </caption>

              <thead className="border-b border-[#DDE3DC] bg-[#F4F6F1] text-xs text-[#65716A]">
                <tr>
                  <th scope="col" className="px-6 py-3.5 font-medium">
                    Société
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3.5 text-right font-medium"
                  >
                    Services
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3.5 text-right font-medium"
                  >
                    Utilisateurs
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E8ECE6]">
                {companies.map((company) => (
                  <tr
                    key={company.id}
                    className="transition-colors hover:bg-[#F8FAF6]"
                  >
                    <th scope="row" className="px-6 py-4 text-left">
                      <Link
                        href={`/companies/${company.id}`}
                        className="group inline-flex min-h-10 items-center gap-3
                          rounded-md font-medium text-[#285448]
                          underline-offset-4 hover:underline
                          focus-visible:outline-none focus-visible:ring-2
                          focus-visible:ring-[#285448] focus-visible:ring-offset-4"
                      >
                        {company.nom}
                        <ArrowUpRight
                          aria-hidden="true"
                          className="size-4 shrink-0 text-[#65716A] group-hover:text-[#285448]"
                        />
                      </Link>
                    </th>

                    <td className="px-6 py-4 text-right tabular-nums text-[#526A5E]">
                      {company._count.services}
                    </td>

                    <td className="px-6 py-4 text-right tabular-nums text-[#526A5E]">
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
  );
}
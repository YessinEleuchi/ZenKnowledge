import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Layers3 } from "lucide-react";
import { z } from "zod";

import { requireAdmin } from "@/server/auth/session";
import { ServiceForm } from "@/modules/services/components/service-form";
import { getCompanyWithServices } from "@/modules/services/server/service.dal";

type CompanyPageProps = {
  params: Promise<{
    companyId: string;
  }>;
};

export default async function CompanyPage({
  params,
}: CompanyPageProps) {
  await requireAdmin();

  const { companyId } = await params;

  if (!z.string().uuid().safeParse(companyId).success) {
    notFound();
  }

  const company = await getCompanyWithServices(companyId);

  if (!company) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <header className="border-b border-[#DDE3DC] pb-6">
        <Link
          href="/companies"
          className="inline-flex min-h-10 items-center gap-2 rounded-md
            text-sm text-[#65716A] transition-colors hover:text-[#285448]
            focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-[#285448] focus-visible:ring-offset-4"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Toutes les sociétés
        </Link>

        <h1 className="mt-3 break-words text-3xl font-semibold tracking-tight text-[#202923]">
          {company.nom}
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#65716A]">
          Organisez les services de cette société et consultez leurs effectifs.
        </p>
      </header>

      <section
        aria-labelledby="create-service-title"
        className="grid gap-6 rounded-xl border border-[#DDE3DC] bg-white p-5 sm:p-6 xl:grid-cols-[240px_minmax(0,1fr)] xl:gap-10"
      >
        <div>
          <h2
            id="create-service-title"
            className="text-base font-semibold text-[#243E35]"
          >
            Nouveau service
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#65716A]">
            Ajoutez un service auquel affecter les collaborateurs de cette société.
          </p>
        </div>

        <div className="min-w-0">
          <ServiceForm companyId={company.id} />
        </div>
      </section>

      <section
        aria-labelledby="services-title"
        className="min-w-0 overflow-hidden rounded-xl border border-[#DDE3DC] bg-white"
      >
        <div className="flex flex-wrap items-center gap-3 border-b border-[#DDE3DC] px-5 py-5 sm:px-6">
          <h2
            id="services-title"
            className="text-base font-semibold text-[#243E35]"
          >
            Services
          </h2>

          <span className="rounded-md bg-[#EDF1EB] px-2 py-0.5 text-xs font-semibold tabular-nums text-[#526A5E]">
            {company.services.length}
          </span>
        </div>

        {company.services.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <Layers3
              aria-hidden="true"
              className="mb-4 size-7 text-[#65716A]"
              strokeWidth={1.5}
            />

            <p className="text-sm font-medium text-[#243E35]">
              Aucun service pour le moment
            </p>

            <p className="mt-2 max-w-sm text-sm leading-6 text-[#65716A]">
              Ajoutez le premier service de {company.nom} avec le formulaire
              ci-dessus.
            </p>
          </div>
        ) : (
          <div
            role="region"
            aria-labelledby="services-title"
            tabIndex={0}
            className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#285448]"
          >
            <table className="w-full min-w-[360px] text-left text-sm">
              <caption className="sr-only">
                Services de {company.nom} et nombre d’utilisateurs affectés
              </caption>

              <thead className="border-b border-[#DDE3DC] bg-[#F4F6F1] text-xs text-[#65716A]">
                <tr>
                  <th scope="col" className="px-6 py-3.5 font-medium">
                    Service
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
                {company.services.map((service) => (
                  <tr
                    key={service.id}
                    className="transition-colors hover:bg-[#F8FAF6]"
                  >
                    <th
                      scope="row"
                      className="px-6 py-5 text-left font-medium text-[#243E35]"
                    >
                      {service.nom}
                    </th>

                    <td className="px-6 py-5 text-right tabular-nums text-[#526A5E]">
                      {service._count.utilisateurs}
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
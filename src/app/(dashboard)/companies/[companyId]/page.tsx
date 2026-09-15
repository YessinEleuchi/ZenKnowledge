import Link from "next/link";
import { notFound } from "next/navigation";
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
    <main className="min-h-screen bg-gray-50 px-6 py-10 text-gray-900">
      <div className="mx-auto max-w-5xl space-y-8">
        <header>
          <Link
            href="/companies"
            className="text-sm text-gray-600 hover:underline"
          >
            Retour aux sociétés
          </Link>

          <h1 className="mt-4 text-3xl font-semibold">
            {company.nom}
          </h1>

          <p className="mt-2 text-gray-600">
            Gérez les services de cette société.
          </p>
        </header>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">
            Nouveau service
          </h2>

          <ServiceForm companyId={company.id} />
        </section>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <h2 className="border-b border-gray-200 p-6 text-lg font-semibold">
            Services ({company.services.length})
          </h2>

          {company.services.length === 0 ? (
            <p className="p-6 text-gray-500">
              Aucun service pour cette société.
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
                      Utilisateurs
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {company.services.map((service) => (
                    <tr key={service.id}>
                      <td className="px-6 py-4 font-medium">
                        {service.nom}
                      </td>
                      <td className="px-6 py-4">
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
    </main>
  );
}
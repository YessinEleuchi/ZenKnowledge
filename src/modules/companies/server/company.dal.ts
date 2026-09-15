import "server-only";

import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { createCompanySchema } from "../company.schema";

export async function listCompanies() {
  await requireAdmin();

  return db.societe.findMany({
    select: {
      id: true,
      nom: true,
      _count: {
        select: {
          services: true,
          utilisateurs: true,
        },
      },
    },
    orderBy: [
      { nom: "asc" },
      { id: "asc" },
    ],
  });
}

export async function createCompany(input: unknown) {
  await requireAdmin();

  const data = createCompanySchema.parse(input);

  return db.societe.create({
    data: {
      nom: data.nom,
    },
    select: {
      id: true,
      nom: true,
    },
  });
}
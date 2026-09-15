import "server-only";

import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { createServiceSchema } from "../service.schema";

export async function getCompanyWithServices(companyId: string) {
  await requireAdmin();

  return db.societe.findUnique({
    where: {
      id: companyId,
    },
    select: {
      id: true,
      nom: true,
      services: {
        orderBy: [
          { nom: "asc" },
          { id: "asc" },
        ],
        select: {
          id: true,
          nom: true,
          _count: {
            select: {
              utilisateurs: true,
            },
          },
        },
      },
    },
  });
}

export async function createService(input: unknown) {
  await requireAdmin();

  const data = createServiceSchema.parse(input);

  return db.service.create({
    data: {
      nom: data.nom,
      societeId: data.societeId,
    },
    select: {
      id: true,
      nom: true,
      societeId: true,
    },
  });
}
import "server-only";

import { db } from "@/server/db";
import { requireCompanyManager } from "@/server/auth/session";
import {
  Role,
  StatutVersion,
} from "@/generated/prisma/enums";

type CreateDocumentRecordInput = {
  documentId: string;
  versionId: string;
  titre: string;
  serviceId: string | null;
  dateRevision: Date;
  accessibleCollaborateurs: boolean;
  cleStockage: string;
  nomFichier: string;
};

export async function getDocumentCreationOptions() {
  const actor = await requireCompanyManager();

  const services = await db.service.findMany({
    where: {
      societeId: actor.societeId,
    },
    select: {
      id: true,
      nom: true,
    },
    orderBy: {
      nom: "asc",
    },
  });

  return { services };
}

export async function listDocuments() {
  const actor = await requireCompanyManager();

  const documents = await db.document.findMany({
    where: {
      societeId: actor.societeId,
      supprimeLe: null,
    },
    select: {
      id: true,
      titre: true,
      dateRevision: true,
      rolesAutorises: true,
      service: {
        select: {
          nom: true,
        },
      },
      versions: {
        orderBy: {
          numero: "desc",
        },
        take: 1,
        select: {
          numero: true,
          statut: true,
        },
      },
    },
    orderBy: {
      titre: "asc",
    },
  });

  // Données directement utilisables par DocumentsLibrary.
  return documents.map((document) => ({
    id: document.id,
    titre: document.titre,
    service: document.service?.nom ?? "Toute la société",
    collaboratorsAllowed:
      document.rolesAutorises.includes(Role.COLLABORATEUR),
    revision: document.dateRevision.toISOString(),
    version: document.versions[0]?.numero ?? null,
    statut: document.versions[0]?.statut ?? null,
  }));
}

export async function isDocumentServiceAllowed(
  serviceId: string | null,
): Promise<boolean> {
  const actor = await requireCompanyManager();

  if (serviceId === null) {
    return true;
  }

  const service = await db.service.findFirst({
    where: {
      id: serviceId,
      societeId: actor.societeId,
    },
    select: {
      id: true,
    },
  });

  return service !== null;
}

export async function createDocumentRecord(
  input: CreateDocumentRecordInput,
) {
  const actor = await requireCompanyManager();

  // La clé doit correspondre au document et à la société courante.
  const expectedKey =
    `societes/${actor.societeId}` +
    `/documents/${input.documentId}/${input.versionId}.pdf`;

  if (input.cleStockage !== expectedKey) {
    throw new Error("Clé de stockage incohérente.");
  }

  // Revérification avant l’écriture, même si l’action a déjà
  // contrôlé le service avant l’upload.
  if (!(await isDocumentServiceAllowed(input.serviceId))) {
    throw new Error("Ce service n’appartient pas à ta société.");
  }

  return db.document.create({
    data: {
      id: input.documentId,
      titre: input.titre,
      societeId: actor.societeId,
      proprietaireId: actor.id,
      serviceId: input.serviceId,
      dateRevision: input.dateRevision,
      rolesAutorises: input.accessibleCollaborateurs
        ? [Role.COLLABORATEUR]
        : [],
      versions: {
        create: {
          id: input.versionId,
          numero: 1,
          cleStockage: input.cleStockage,
          nomFichier: input.nomFichier,
          typeMime: "application/pdf",
          statut: StatutVersion.EN_ATTENTE,
        },
      },
    },
    select: {
      id: true,
    },
  });
}
import "server-only";

import { db } from "@/server/db";
import { requireCompanyManager } from "@/server/auth/session";
import { Role, StatutVersion ,   StatutExecution,
 } from "@/types/enums";
import { randomUUID } from "node:crypto";
import type { DocumentItem } from "../document.types";

type DocumentFields = {
  titre: string;
  serviceId: string | null;
  dateRevision: Date;
  accessibleCollaborateurs: boolean;
};

type VersionInput = {
  versionId: string;
  cleStockage: string;
  nomFichier: string;
};

type CreateDocumentRecordInput = DocumentFields &
  VersionInput & {
    documentId: string;
  };

type UpdateDocumentRecordInput = DocumentFields & {
  documentId: string;
  expectedVersionId: string | null;
  newVersion: VersionInput | null;
};

export class DocumentInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentInputError";
  }
}

function validateStorageKey(
  societeId: string,
  documentId: string,
  version: VersionInput,
) {
  const expected =
    `societes/${societeId}` +
    `/documents/${documentId}/${version.versionId}.pdf`;

  if (version.cleStockage !== expected) {
    throw new DocumentInputError("Clé de stockage incohérente.");
  }
}

function isTransactionConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2034"
  );
}

export async function getDocumentCreationOptions() {
  const actor = await requireCompanyManager();

  const services = await db.service.findMany({
    where: { societeId: actor.societeId },
    select: { id: true, nom: true },
    orderBy: { nom: "asc" },
  });

  return { services };
}

export async function listDocuments(): Promise<DocumentItem[]> {
  const actor = await requireCompanyManager();

  const documents = await db.document.findMany({
    where: {
      societeId: actor.societeId,
      supprimeLe: null,
    },
    select: {
      id: true,
      titre: true,
      serviceId: true,
      dateRevision: true,
      rolesAutorises: true,
      service: {
        select: { nom: true },
      },
      versions: {
        orderBy: { numero: "desc" },
        select: {
          id: true,
          numero: true,
          statut: true,
          nomFichier: true,
          creeLe: true,
        },
      },
    },
    orderBy: { titre: "asc" },
  });

  return documents.map((document) => ({
    id: document.id,
    titre: document.titre,
    serviceId: document.serviceId,
    service: document.service?.nom ?? "Toute la société",
    collaboratorsAllowed:
      document.rolesAutorises.includes(Role.COLLABORATEUR),
    revision: document.dateRevision.toISOString(),
    version: document.versions[0]?.numero ?? null,
    statut: document.versions[0]?.statut ?? null,
    versions: document.versions.map((version) => ({
      ...version,
      creeLe: version.creeLe.toISOString(),
    })),
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
    select: { id: true },
  });

  return service !== null;
}

// Contrôle avant l’upload, puis nouveau contrôle dans la transaction.
export async function assertDocumentCanBeEdited(documentId: string) {
  const actor = await requireCompanyManager();

  const document = await db.document.findFirst({
    where: {
      id: documentId,
      societeId: actor.societeId,
      supprimeLe: null,
    },
    select: { id: true },
  });

  if (!document) {
    throw new DocumentInputError("Document introuvable ou inaccessible.");
  }
}

export async function createDocumentRecord(
  input: CreateDocumentRecordInput,
) {
  const actor = await requireCompanyManager();

  const expectedKey =
    `societes/${actor.societeId}` +
    `/documents/${input.documentId}/${input.versionId}.pdf`;

  if (input.cleStockage !== expectedKey) {
    throw new Error("Clé de stockage incohérente.");
  }

  if (!(await isDocumentServiceAllowed(input.serviceId))) {
    throw new Error("Ce service n’appartient pas à ta société.");
  }

  const executionId = randomUUID();

  await db.document.create({
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

          ingestions: {
            create: {
              id: executionId,
              statut: StatutExecution.EN_ATTENTE,
              etape: "DECLENCHEMENT",
              tentative: 1,
            },
          },
        },
      },
    },
    select: {
      id: true,
    },
  });

  return {
    documentId: input.documentId,
    versionId: input.versionId,
    executionId,
  };
}
export async function updateDocumentRecord(
  input: UpdateDocumentRecordInput,
) {
  const actor = await requireCompanyManager();

  if (input.newVersion) {
    validateStorageKey(
      actor.societeId,
      input.documentId,
      input.newVersion,
    );
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(
        async (tx) => {
          const document = await tx.document.findFirst({
            where: {
              id: input.documentId,
              societeId: actor.societeId,
              supprimeLe: null,
            },
            select: {
              id: true,
              versions: {
                orderBy: { numero: "desc" },
                take: 1,
                select: { id: true, numero: true },
              },
            },
          });

          if (!document) {
            throw new DocumentInputError(
              "Document introuvable ou inaccessible.",
            );
          }

          const latest = document.versions[0];

          if ((latest?.id ?? null) !== input.expectedVersionId) {
            throw new DocumentInputError(
              "Une nouvelle version existe déjà. Actualise la page avant de réessayer.",
            );
          }

          if (input.serviceId) {
            const service = await tx.service.findFirst({
              where: {
                id: input.serviceId,
                societeId: actor.societeId,
              },
              select: { id: true },
            });

            if (!service) {
              throw new DocumentInputError(
                "Ce service n’appartient pas à ta société.",
              );
            }
          }

          await tx.document.update({
            where: { id: document.id },
            data: {
              titre: input.titre,
              serviceId: input.serviceId,
              dateRevision: input.dateRevision,
              rolesAutorises: input.accessibleCollaborateurs
                ? [Role.COLLABORATEUR]
                : [],
            },
          });

          if (input.newVersion) {
            // Conservation des fichiers, chunks et références de citations.
            await tx.versionDocument.updateMany({
              where: {
                documentId: document.id,
                statut: { not: StatutVersion.ARCHIVEE },
              },
              data: { statut: StatutVersion.ARCHIVEE },
            });

            await tx.versionDocument.create({
              data: {
                id: input.newVersion.versionId,
                documentId: document.id,
                numero: (latest?.numero ?? 0) + 1,
                cleStockage: input.newVersion.cleStockage,
                nomFichier: input.newVersion.nomFichier,
                typeMime: "application/pdf",
                statut: StatutVersion.EN_ATTENTE,
              },
            });
          }

          return { id: document.id };
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      if (isTransactionConflict(error) && attempt < 2) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Impossible de terminer la transaction.");
}

export async function recordIngestionDispatchIssue(
  executionId: string,
) {
  const actor = await requireCompanyManager();

  await db.executionIngestion.updateMany({
    where: {
      id: executionId,
      statut: StatutExecution.EN_ATTENTE,
      etape: "DECLENCHEMENT",
      version: {
        document: {
          societeId: actor.societeId,
          supprimeLe: null,
        },
      },
    },
    data: {
      erreur:
        "Réception par n8n non confirmée. Vérifier avant de relancer.",
    },
  });
}
export async function prepareDocumentIngestion(versionId: string) {
  const actor = await requireCompanyManager();

  return db.$transaction(async (tx) => {
    // Cette écriture verrouille la version pendant la transaction.
    // Deux appels concurrents seront traités successivement.
    const version = await tx.versionDocument.updateMany({
      where: {
        id: versionId,
        statut: StatutVersion.EN_ATTENTE,
        document: {
          societeId: actor.societeId,
          supprimeLe: null,
        },
      },
      data: {
        statut: StatutVersion.EN_ATTENTE,
      },
    });

    if (version.count !== 1) {
      throw new DocumentInputError(
        "Cette version ne peut pas être mise en ingestion.",
      );
    }

    const existing = await tx.executionIngestion.findFirst({
      where: {
        versionId,
        statut: {
          in: [
            StatutExecution.EN_ATTENTE,
            StatutExecution.EN_COURS,
            StatutExecution.SUCCES,
          ],
        },
      },
      select: {
        id: true,
        statut: true,
      },
    });

    if (existing) {
      if (existing.statut !== StatutExecution.EN_ATTENTE) {
        throw new DocumentInputError(
          "Cette ingestion est déjà en cours ou terminée.",
        );
      }

      return {
        executionId: existing.id,
        versionId,
      };
    }

    const lastExecution = await tx.executionIngestion.findFirst({
      where: { versionId },
      orderBy: { tentative: "desc" },
      select: { tentative: true },
    });

    const execution = await tx.executionIngestion.create({
      data: {
        versionId,
        statut: StatutExecution.EN_ATTENTE,
        etape: "DECLENCHEMENT",
        tentative: (lastExecution?.tentative ?? 0) + 1,
      },
      select: { id: true },
    });

    return {
      executionId: execution.id,
      versionId,
    };
  });
}

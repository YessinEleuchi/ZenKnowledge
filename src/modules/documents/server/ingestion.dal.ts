import "server-only";

import { randomUUID } from "node:crypto";

import { db } from "@/server/db";
import {
  StatutExecution,
  StatutVersion,
} from "@/generated/prisma/enums";

import { completeIngestionSchema } from "./ingestion.schema";

export class IngestionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IngestionConflictError";
  }
}

export async function claimIngestion(
  executionId: string,
  versionId: string,
) {
  return db.$transaction(async (tx) => {
    const execution = await tx.executionIngestion.updateMany({
      where: {
        id: executionId,
        versionId,
        statut: StatutExecution.EN_ATTENTE,
        version: {
          statut: StatutVersion.EN_ATTENTE,
          document: {
            supprimeLe: null,
          },
        },
      },
      data: {
        statut: StatutExecution.EN_COURS,
        etape: "EXTRACTION",
        debut: new Date(),
        fin: null,
        erreur: null,
      },
    });

    if (execution.count !== 1) {
      throw new IngestionConflictError(
        "Exécution indisponible ou déjà prise en charge.",
      );
    }

    const version = await tx.versionDocument.updateMany({
      where: {
        id: versionId,
        statut: StatutVersion.EN_ATTENTE,
        document: {
          supprimeLe: null,
        },
      },
      data: {
        statut: StatutVersion.EN_TRAITEMENT,
      },
    });

    if (version.count !== 1) {
      throw new IngestionConflictError(
        "La version ne peut pas être traitée.",
      );
    }

    return tx.versionDocument.findUniqueOrThrow({
      where: {
        id: versionId,
      },
      select: {
        cleStockage: true,
      },
    });
  });
}

export async function failIngestion(
  executionId: string,
  versionId: string,
  message: string,
) {
  return db.$transaction(async (tx) => {
    const execution = await tx.executionIngestion.updateMany({
      where: {
        id: executionId,
        versionId,
        statut: StatutExecution.EN_COURS,
        etape: "EXTRACTION",
        version: {
          statut: StatutVersion.EN_TRAITEMENT,
        },
      },
      data: {
        statut: StatutExecution.ECHEC,
        erreur: message,
        fin: new Date(),
      },
    });

    if (execution.count !== 1) {
      return false;
    }

    const version = await tx.versionDocument.updateMany({
      where: {
        id: versionId,
        statut: StatutVersion.EN_TRAITEMENT,
      },
      data: {
        statut: StatutVersion.ECHEC,
      },
    });

    if (version.count !== 1) {
      throw new IngestionConflictError(
        "La version a changé pendant le traitement.",
      );
    }

    return true;
  });
}

export async function completeIngestion(input: unknown) {
  // Le type des chunks est déduit du schéma Zod.
  const data = completeIngestionSchema.parse(input);

  return db.$transaction(
    async (tx) => {
      // Verrouiller l’exécution et vérifier sa version.
      const claimed = await tx.executionIngestion.updateMany({
        where: {
          id: data.executionId,
          versionId: data.versionId,
          statut: StatutExecution.EN_COURS,
          version: {
            statut: StatutVersion.EN_TRAITEMENT,
            document: {
              supprimeLe: null,
            },
          },
        },
        data: {
          etape: "ENREGISTREMENT",
        },
      });

      if (claimed.count !== 1) {
        // Acquitter un nouvel appel après un commit déjà réussi.
        const completed = await tx.executionIngestion.findFirst({
          where: {
            id: data.executionId,
            versionId: data.versionId,
            statut: StatutExecution.SUCCES,
            etape: "TERMINEE",
            version: {
              document: {
                supprimeLe: null,
              },
            },
          },
          select: {
            id: true,
          },
        });

        if (completed) {
          const count = await tx.chunk.count({
            where: {
              versionId: data.versionId,
            },
          });

          return {
            alreadyCompleted: true,
            totalChunks: count,
          };
        }

        throw new IngestionConflictError(
          "Exécution indisponible, en échec ou version non modifiable.",
        );
      }

      // Verrouiller également la version avant toute insertion.
      const version = await tx.versionDocument.updateMany({
        where: {
          id: data.versionId,
          statut: StatutVersion.EN_TRAITEMENT,
          document: {
            supprimeLe: null,
          },
        },
        data: {
          statut: StatutVersion.EN_TRAITEMENT,
        },
      });

      if (version.count !== 1) {
        throw new IngestionConflictError(
          "La version a changé pendant l’enregistrement.",
        );
      }

      const existingChunks = await tx.chunk.count({
        where: {
          versionId: data.versionId,
        },
      });

      if (existingChunks > 0) {
        throw new IngestionConflictError(
          "Cette version possède déjà des chunks. Aucun écrasement effectué.",
        );
      }

      const orderedChunks = [...data.chunks].sort(
        (a, b) => a.position - b.position,
      );

      let previousPage: number | null = null;
      let passageDansPage = 0;

      for (const chunk of orderedChunks) {
        const id = randomUUID();
        const vector = JSON.stringify(chunk.embedding);

        if (chunk.pageDebut !== previousPage) {
          previousPage = chunk.pageDebut;
          passageDansPage = 1;
        } else {
          passageDansPage++;
        }

        // Repère reconstruit côté serveur pour rester cohérent.
        const reperePassage =
          `Page ${chunk.pageDebut} · Passage ${passageDansPage}`;

        // Requête paramétrée : aucune concaténation SQL.
        await tx.$executeRaw`
          INSERT INTO "Chunk" (
            "id",
            "versionId",
            "position",
            "contenu",
            "pageDebut",
            "pageFin",
            "reperePassage",
            "embedding",
            "modeleEmbedding"
          )
          VALUES (
            ${id}::uuid,
            ${data.versionId}::uuid,
            ${chunk.position},
            ${chunk.contenu},
            ${chunk.pageDebut},
            ${chunk.pageFin},
            ${reperePassage},
            ${vector}::vector(768),
            ${data.modeleEmbedding}
          )
        `;
      }

      const completedAt = new Date();

      await tx.versionDocument.update({
        where: {
          id: data.versionId,
        },
        data: {
          statut: StatutVersion.PUBLIEE,
          publieLe: completedAt,
        },
      });

      await tx.executionIngestion.update({
        where: {
          id: data.executionId,
        },
        data: {
          statut: StatutExecution.SUCCES,
          etape: "TERMINEE",
          erreur: null,
          fin: completedAt,
        },
      });

      return {
        alreadyCompleted: false,
        totalChunks: orderedChunks.length,
      };
    },
    {
      maxWait: 5000,
      timeout: 30000,
    },
  );
}
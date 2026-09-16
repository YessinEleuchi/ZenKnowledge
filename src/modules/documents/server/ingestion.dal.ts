import "server-only";

import { db } from "@/server/db";
import {
  StatutExecution,
  StatutVersion,
} from "@/generated/prisma/enums";
import { randomUUID } from "node:crypto";

import { completeIngestionSchema } from "./ingestion.schema";

export class IngestionConflictError extends Error {}

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
      // Annule également la modification de l’exécution.
      throw new IngestionConflictError(
        "La version ne peut pas être traitée.",
      );
    }

    return tx.versionDocument.findUniqueOrThrow({
      where: { id: versionId },
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
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { isInternalWorkflowRequest } from
  "@/server/workflows/internal-auth";


export const runtime = "nodejs";

const MAX_BODY_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  if (!isInternalWorkflowRequest(request)) {
    return Response.json(
      { error: "Accès refusé." },
      { status: 401 },
    );
  }

  // Lecture bornée pour éviter de charger un corps trop volumineux.
  const reader = request.body?.getReader();

  if (!reader) {
    return Response.json(
      { error: "Corps de requête manquant." },
      { status: 400 },
    );
  }

  const buffers: Buffer[] = [];
  let size = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      size += value.byteLength;

      if (size > MAX_BODY_BYTES) {
        await reader.cancel();

        return Response.json(
          { error: "Le corps dépasse la limite de 4 Mo." },
          { status: 413 },
        );
      }

      buffers.push(Buffer.from(value));
    }
  } catch {
    return Response.json(
      { error: "Lecture de la requête impossible." },
      { status: 400 },
    );
  }

  let body: unknown;

  try {
    body = JSON.parse(Buffer.concat(buffers).toString("utf8"));
  } catch {
    return Response.json(
      { error: "JSON invalide." },
      { status: 400 },
    );
  }

  try {
    const result = await completeIngestion(body);

    revalidatePath("/documents");

    return Response.json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        {
          error: "Données d’ingestion invalides.",
          details: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    if (error instanceof IngestionConflictError) {
      return Response.json(
        { error: error.message },
        { status: 409 },
      );
    }

    console.error("Échec de l’enregistrement des chunks :", error);

    return Response.json(
      { error: "Enregistrement impossible. La transaction a été annulée." },
      { status: 500 },
    );
  }
}
export async function completeIngestion(input: unknown) {
  // Validation également à la frontière du DAL.
  const data = completeIngestionSchema.parse(input);

  return db.$transaction(
    async (tx) => {
      // Verrouille l’exécution et vérifie son association à la version.
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
        // Une réponse réseau peut être perdue après un commit réussi.
        // Un nouvel appel est alors acquitté sans réinsérer les chunks.
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
          select: { id: true },
        });

        if (completed) {
          const count = await tx.chunk.count({
            where: { versionId: data.versionId },
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

      // Verrouille également la version avant l’insertion.
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

      for (const chunk of data.chunks) {
        const id = randomUUID();
        const reperePassage = `Passage ${chunk.position}`;
        const vector = JSON.stringify(chunk.embedding);

        // Requête paramétrée : ne pas utiliser $executeRawUnsafe.
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
            NULL,
            NULL,
            ${reperePassage},
            ${vector}::vector(768),
            ${data.modeleEmbedding}
          )
        `;
      }

      await tx.versionDocument.update({
        where: {
          id: data.versionId,
        },
        data: {
          statut: StatutVersion.PUBLIEE,
          publieLe: new Date(),
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
          fin: new Date(),
        },
      });

      return {
        alreadyCompleted: false,
        totalChunks: data.chunks.length,
      };
    },
    {
      maxWait: 5000,
      timeout: 30000,
    },
  );
}
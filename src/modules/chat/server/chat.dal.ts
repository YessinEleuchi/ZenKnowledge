import "server-only";

import { Prisma } from "@/generated/prisma/client";

import { db } from "@/server/db";
import { requireUser } from "@/server/auth/session";
import {
  getDocumentReadScope,
  getTodayInTunis,
} from "@/modules/documents/server/document.permissions";

import { StatutVersion } from "@/types/enums";

const EMBEDDING_MODEL = "gemini-embedding-2";
const EMBEDDING_DIMENSIONS = 768;
const MIN_SIMILARITY = 0.55;

export type RetrievedPassage = {
  chunkId: string;
  documentId: string;
  versionId: string;
  titre: string;
  numeroVersion: number;
  position: number;
  contenu: string;
  reperePassage: string;
  pageDebut: number | null;
  pageFin: number | null;
  score: number;
};

type SearchPassagesInput = {
  embedding: number[];
  modeleEmbedding: string;
  topK?: number;
};

function validateEmbedding(
  embedding: number[],
  modeleEmbedding: string,
) {
  if (modeleEmbedding !== EMBEDDING_MODEL) {
    throw new Error("Modèle d’embeddings incompatible.");
  }

  if (
    !Array.isArray(embedding) ||
    embedding.length !== EMBEDDING_DIMENSIONS ||
    !embedding.every(
      (value) =>
        typeof value === "number" &&
        Number.isFinite(value) &&
        Math.abs(value) <= 1_000_000,
    )
  ) {
    throw new Error("Le vecteur doit contenir 768 nombres valides.");
  }

  const norm = Math.hypot(...embedding);

  if (norm < 1e-12) {
    throw new Error("Le vecteur ne doit pas être nul.");
  }
}

export async function searchAuthorizedPassages({
  embedding,
  modeleEmbedding,
  topK = 5,
}: SearchPassagesInput): Promise<RetrievedPassage[]> {
  const actor = await requireUser();

  validateEmbedding(embedding, modeleEmbedding);

  if (!Number.isInteger(topK) || topK < 1 || topK > 10) {
    throw new Error("topK doit être compris entre 1 et 10.");
  }

  const scope = getDocumentReadScope(actor);

  // ADMIN, utilisateur sans société ou autre rôle non autorisé.
  if (!scope) {
    return [];
  }

  const today = getTodayInTunis();
  const vector = JSON.stringify(embedding);

  return db.$transaction(
    async (tx) => {
      // Réutilisation des permissions de la bibliothèque.
      const documents = await tx.document.findMany({
        where: {
          AND: [
            scope.where,
            {
              dateRevision: {
                gt: today,
              },
            },
          ],
        },
        select: {
          versions: {
            orderBy: {
              numero: "desc",
            },
            take: 1,
            select: {
              id: true,
              statut: true,
            },
          },
        },
      });

      // Sélectionner la dernière version AVANT de vérifier son statut.
      // Sinon, on pourrait récupérer une ancienne version publiée.
      const versionIds = documents.flatMap((document) => {
        const latest = document.versions[0];

        return latest?.statut === StatutVersion.PUBLIEE
          ? [latest.id]
          : [];
      });

      if (versionIds.length === 0) {
        return [];
      }

      const authorizedVersionIds = Prisma.join(
        versionIds.map((id) => Prisma.sql`${id}::uuid`),
      );

      // Les identifiants autorisés viennent de la base et de la session.
      // Aucune société ou liste de documents n’est fournie par le client.
      return tx.$queryRaw<RetrievedPassage[]>(Prisma.sql`
  SELECT
    c."id" AS "chunkId",
    d."id" AS "documentId",
    v."id" AS "versionId",
    d."titre" AS "titre",
    v."numero" AS "numeroVersion",
    c."position" AS "position",
    c."contenu" AS "contenu",
    c."reperePassage" AS "reperePassage",
    c."pageDebut" AS "pageDebut",
    c."pageFin" AS "pageFin",
    (
      1 - (c."embedding" <=> ${vector}::vector(768))
    )::double precision AS "score"
  FROM "Chunk" c
  JOIN "VersionDocument" v
    ON v."id" = c."versionId"
  JOIN "Document" d
    ON d."id" = v."documentId"
  WHERE
    c."versionId" IN (${authorizedVersionIds})
    AND c."modeleEmbedding" = ${EMBEDDING_MODEL}
    AND c."embedding" IS NOT NULL
    AND vector_dims(c."embedding") = ${EMBEDDING_DIMENSIONS}
    AND (
      1 - (c."embedding" <=> ${vector}::vector(768))
    ) >= ${MIN_SIMILARITY}
  ORDER BY
    c."embedding" <=> ${vector}::vector(768),
    c."id"
  LIMIT ${topK}
`);
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      maxWait: 5000,
      timeout: 15000,
    },
  );
}
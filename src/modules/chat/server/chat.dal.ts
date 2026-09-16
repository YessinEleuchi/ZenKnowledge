import "server-only";

import { Prisma } from "@/generated/prisma/client";

import { db } from "@/server/db";
import { requireUser } from "@/server/auth/session";

import {
  getDocumentReadScope,
  getTodayInTunis,
} from "@/modules/documents/server/document.permissions";

import { StatutVersion } from "@/types/enums";

import type {
  ChatCitation,
  StoredConversation,
} from "../chat.types";

const EMBEDDING_MODEL = "gemini-embedding-2";
const EMBEDDING_DIMENSIONS = 768;
const MIN_SIMILARITY = 0.55;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PENDING_MODEL = "PENDING";

/* -------------------------------------------------------------------------- */
/*                                    TYPES                                   */
/* -------------------------------------------------------------------------- */

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

type BeginRagTurnInput = {
  question: string;
};

type CompleteRagTurnInput = {
  executionId: string;
  reponse: string;
  citations: ChatCitation[];
  modele: string;
  sourcesInsuffisantes: boolean;
  latenceMs?: number | null;
  tokensEntree?: number | null;
  tokensSortie?: number | null;
};

/* -------------------------------------------------------------------------- */
/*                                   HELPERS                                  */
/* -------------------------------------------------------------------------- */

function validateUuid(
  value: string,
  label: string,
) {
  if (!UUID.test(value)) {
    throw new Error(`${label} invalide.`);
  }
}

function validateEmbedding(
  embedding: number[],
  modeleEmbedding: string,
) {
  if (modeleEmbedding !== EMBEDDING_MODEL) {
    throw new Error(
      "Modèle d’embeddings incompatible.",
    );
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
    throw new Error(
      "Le vecteur doit contenir 768 nombres valides.",
    );
  }

  const norm = Math.hypot(...embedding);

  if (norm < 1e-12) {
    throw new Error(
      "Le vecteur ne doit pas être nul.",
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                         RECHERCHE VECTORIELLE RAG                          */
/* -------------------------------------------------------------------------- */

export async function searchAuthorizedPassages({
  embedding,
  modeleEmbedding,
  topK = 5,
}: SearchPassagesInput): Promise<
  RetrievedPassage[]
> {
  const actor = await requireUser();

  validateEmbedding(
    embedding,
    modeleEmbedding,
  );

  if (
    !Number.isInteger(topK) ||
    topK < 1 ||
    topK > 10
  ) {
    throw new Error(
      "topK doit être compris entre 1 et 10.",
    );
  }

  const scope =
    getDocumentReadScope(actor);

  if (!scope) {
    return [];
  }

  const today = getTodayInTunis();
  const vector =
    JSON.stringify(embedding);

  return db.$transaction(
    async (tx) => {
      const documents =
        await tx.document.findMany({
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

      /*
       * On sélectionne d'abord la dernière
       * version du document.
       *
       * Ensuite seulement on vérifie qu'elle
       * est publiée.
       */
      const versionIds =
        documents.flatMap(
          (document) => {
            const latest =
              document.versions[0];

            return latest?.statut ===
              StatutVersion.PUBLIEE
              ? [latest.id]
              : [];
          },
        );

      if (versionIds.length === 0) {
        return [];
      }

      const authorizedVersionIds =
        Prisma.join(
          versionIds.map(
            (id) =>
              Prisma.sql`${id}::uuid`,
          ),
        );

      return tx.$queryRaw<
        RetrievedPassage[]
      >(Prisma.sql`
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
            1 - (
              c."embedding"
              <=>
              ${vector}::vector(768)
            )
          )::double precision AS "score"

        FROM "Chunk" c

        JOIN "VersionDocument" v
          ON v."id" = c."versionId"

        JOIN "Document" d
          ON d."id" = v."documentId"

        WHERE
          c."versionId" IN (
            ${authorizedVersionIds}
          )

          AND c."modeleEmbedding" =
            ${EMBEDDING_MODEL}

          AND c."embedding" IS NOT NULL

          AND vector_dims(
            c."embedding"
          ) = ${EMBEDDING_DIMENSIONS}

          AND (
            1 - (
              c."embedding"
              <=>
              ${vector}::vector(768)
            )
          ) >= ${MIN_SIMILARITY}

        ORDER BY
          c."embedding"
            <=>
          ${vector}::vector(768),

          c."id"

        LIMIT ${topK}
      `);
    },

    {
      isolationLevel:
        Prisma.TransactionIsolationLevel
          .RepeatableRead,

      maxWait: 5000,
      timeout: 15000,
    },
  );
}

/* -------------------------------------------------------------------------- */
/*                         DÉBUT D'UN TOUR RAG                                */
/* -------------------------------------------------------------------------- */

export async function beginRagTurn({
  question,
}: BeginRagTurnInput) {
  const actor = await requireUser();

  const societeId = actor.societeId;

  if (!societeId) {
    throw new Error(
      "Une société est nécessaire pour utiliser le chat.",
    );
  }

  const cleanQuestion =
    question.trim();

  if (
    cleanQuestion.length < 3 ||
    cleanQuestion.length > 2000
  ) {
    throw new Error(
      "Question invalide.",
    );
  }

  return db.$transaction(
    async (tx) => {
      /*
       * Une seule conversation par utilisateur.
       *
       * utilisateurId doit être @unique
       * dans le modèle Prisma Conversation.
       */
      const conversation =
        await tx.conversation.upsert({
          where: {
            utilisateurId:
              actor.id,
          },

          update: {},

          create: {
            utilisateurId:
              actor.id,

            societeId,

            titre:
              "Assistant documentaire",
          },

          select: {
            id: true,
            societeId: true,
          },
        });

      /*
       * Si l'utilisateur a changé de société,
       * on ne réutilise jamais silencieusement
       * une conversation d'une autre société.
       */
      if (
        conversation.societeId !==
        societeId
      ) {
        throw new Error(
          "La conversation n’appartient pas à la société actuelle.",
        );
      }

      /*
       * Sauvegarder la question utilisateur.
       */
      const questionMessage =
        await tx.message.create({
          data: {
            conversationId:
              conversation.id,

            role: "USER",

            contenu:
              cleanQuestion,
          },

          select: {
            id: true,
            creeLe: true,
          },
        });

      /*
       * Créer l'exécution avant le retrieval.
       *
       * Le véritable modèle LLM sera connu
       * après le retour du workflow n8n.
       */
      const execution =
        await tx.executionRAG.create({
          data: {
            questionId:
              questionMessage.id,

            modele:
              PENDING_MODEL,

            statut:
              "EN_COURS",
          },

          select: {
            id: true,
          },
        });

      await tx.conversation.update({
        where: {
          id:
            conversation.id,
        },

        data: {
          dernierMessageLe:
            questionMessage.creeLe,
        },
      });

      return {
        conversationId:
          conversation.id,

        questionMessageId:
          questionMessage.id,

        executionId:
          execution.id,
      };
    },
  );
}

/* -------------------------------------------------------------------------- */
/*                        SAUVEGARDE DU RETRIEVAL                             */
/* -------------------------------------------------------------------------- */

export async function saveRetrievedPassages({
  executionId,
  passages,
}: {
  executionId: string;
  passages: RetrievedPassage[];
}) {
  const actor = await requireUser();

  const societeId =
    actor.societeId;

  if (!societeId) {
    throw new Error(
      "Une société est nécessaire pour utiliser le chat.",
    );
  }

  validateUuid(
    executionId,
    "Identifiant d’exécution",
  );

  /*
   * Vérifier que l'exécution appartient bien
   * à l'utilisateur connecté.
   */
  const execution =
    await db.executionRAG.findFirst({
      where: {
        id:
          executionId,

        question: {
          conversation: {
            utilisateurId:
              actor.id,

            societeId,
          },
        },
      },

      select: {
        id: true,
      },
    });

  if (!execution) {
    throw new Error(
      "Exécution RAG introuvable.",
    );
  }

  if (passages.length === 0) {
    return;
  }

  if (passages.length > 10) {
    throw new Error(
      "Trop de passages à enregistrer.",
    );
  }

  await db.passageRecupere.createMany({
    data:
      passages.map(
        (passage, index) => ({
          executionId,

          chunkId:
            passage.chunkId,

          rang:
            index + 1,

          score:
            passage.score,
        }),
      ),

    /*
     * Utile en cas de retry.
     */
    skipDuplicates: true,
  });
}

/* -------------------------------------------------------------------------- */
/*                         FINALISATION DU TOUR RAG                            */
/* -------------------------------------------------------------------------- */

export async function completeRagTurn({
  executionId,
  reponse,
  citations,
  modele,
  sourcesInsuffisantes,
  latenceMs = null,
  tokensEntree = null,
  tokensSortie = null,
}: CompleteRagTurnInput) {
  const actor = await requireUser();

  const societeId =
    actor.societeId;

  if (!societeId) {
    throw new Error(
      "Une société est nécessaire pour utiliser le chat.",
    );
  }

  validateUuid(
    executionId,
    "Identifiant d’exécution",
  );

  const cleanResponse =
    reponse.trim();

  if (
    cleanResponse.length < 1 ||
    cleanResponse.length > 10_000
  ) {
    throw new Error(
      "Réponse invalide.",
    );
  }

  const cleanModel =
    modele.trim();

  if (
    cleanModel.length < 1 ||
    cleanModel.length > 200
  ) {
    throw new Error(
      "Modèle LLM invalide.",
    );
  }

  return db.$transaction(
    async (tx) => {
      /*
       * Vérifier ownership de l'exécution
       * et récupérer les passages retrouvés.
       */
      const execution =
        await tx.executionRAG.findFirst({
          where: {
            id:
              executionId,

            question: {
              conversation: {
                utilisateurId:
                  actor.id,

                societeId,
              },
            },
          },

          select: {
            id: true,
            reponseId: true,

            question: {
              select: {
                conversationId:
                  true,
              },
            },

            passages: {
              select: {
                id: true,
                chunkId: true,
              },
            },
          },
        });

      if (!execution) {
        throw new Error(
          "Exécution RAG introuvable.",
        );
      }

      /*
       * Une ExecutionRAG ne peut produire
       * qu'une seule réponse.
       */
      if (execution.reponseId) {
        throw new Error(
          "Cette exécution possède déjà une réponse.",
        );
      }

      /*
       * Associer chunkId →
       * PassageRecupere.id.
       */
      const passageByChunkId =
        new Map(
          execution.passages.map(
            (passage) => [
              passage.chunkId,
              passage.id,
            ],
          ),
        );

      const seenCitationNumbers =
        new Set<number>();

      const citationData =
        citations.map(
          (citation) => {
            if (
              seenCitationNumbers.has(
                citation.numero,
              )
            ) {
              throw new Error(
                "Numéro de citation dupliqué.",
              );
            }

            seenCitationNumbers.add(
              citation.numero,
            );

            const passageRecupereId =
              passageByChunkId.get(
                citation.chunkId,
              );

            if (!passageRecupereId) {
              throw new Error(
                "Une citation ne correspond à aucun passage récupéré.",
              );
            }

            return {
              numero:
                citation.numero,

              extrait:
                citation.extrait,

              passageRecupereId,
            };
          },
        );

      /*
       * Une réponse d'abstention ne doit
       * jamais contenir de citation.
       */
      if (
        sourcesInsuffisantes &&
        citationData.length > 0
      ) {
        throw new Error(
          "Une réponse insuffisante ne peut pas contenir de citations.",
        );
      }

      /*
       * Créer le message ASSISTANT.
       */
      const assistantMessage =
        await tx.message.create({
          data: {
            conversationId:
              execution.question
                .conversationId,

            role:
              "ASSISTANT",

            contenu:
              cleanResponse,
          },

          select: {
            id: true,
            creeLe: true,
          },
        });

      /*
       * Sauvegarder les citations utilisées.
       */
      if (
        citationData.length > 0
      ) {
        await tx.citation.createMany({
          data:
            citationData.map(
              (citation) => ({
                messageId:
                  assistantMessage.id,

                passageRecupereId:
                  citation.passageRecupereId,

                numero:
                  citation.numero,

                extrait:
                  citation.extrait,
              }),
            ),
        });
      }

      /*
       * Finaliser ExecutionRAG.
       */
      await tx.executionRAG.update({
        where: {
          id:
            execution.id,
        },

        data: {
          reponseId:
            assistantMessage.id,

          modele:
            cleanModel,

          statut:
            "SUCCES",

          sourcesInsuffisantes,

          latenceMs,

          tokensEntree,

          tokensSortie,
        },
      });

      /*
       * Mettre à jour la date du dernier
       * message de la conversation.
       */
      await tx.conversation.update({
        where: {
          id:
            execution.question
              .conversationId,
        },

        data: {
          dernierMessageLe:
            assistantMessage.creeLe,
        },
      });

      return {
        assistantMessageId:
          assistantMessage.id,
      };
    },
  );
}

/* -------------------------------------------------------------------------- */
/*                           ÉCHEC D'UN TOUR RAG                               */
/* -------------------------------------------------------------------------- */

export async function failRagTurn(
  executionId: string,
) {
  const actor = await requireUser();

  const societeId =
    actor.societeId;

  if (!societeId) {
    return;
  }

  validateUuid(
    executionId,
    "Identifiant d’exécution",
  );

  await db.executionRAG.updateMany({
    where: {
      id:
        executionId,

      question: {
        conversation: {
          utilisateurId:
            actor.id,

          societeId,
        },
      },
    },

    data: {
      statut:
        "ECHEC",
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                     CHARGEMENT DE LA CONVERSATION                          */
/* -------------------------------------------------------------------------- */

export async function getUserConversation(): Promise<
  StoredConversation | null
> {
  const actor = await requireUser();

  const societeId =
    actor.societeId;

  if (!societeId) {
    return null;
  }

  /*
   * utilisateurId est @unique,
   * donc findUnique est suffisant.
   */
  const conversation =
    await db.conversation.findUnique({
      where: {
        utilisateurId:
          actor.id,
      },

      select: {
        id: true,
        societeId: true,
        titre: true,
        creeLe: true,
        dernierMessageLe: true,

        messages: {
          orderBy: [
            {
              creeLe:
                "asc",
            },
            {
              id:
                "asc",
            },
          ],

          select: {
            id: true,
            role: true,
            contenu: true,
            creeLe: true,

            /*
             * Pour les messages ASSISTANT,
             * permet de restaurer le badge
             * "Informations insuffisantes".
             */
            executionReponse: {
              select: {
                sourcesInsuffisantes:
                  true,
              },
            },

            /*
             * Le feedback sera utilisé à
             * l'étape suivante.
             */
            feedbacks: {
              where: {
                utilisateurId:
                  actor.id,
              },

              select: {
                evaluation:
                  true,
              },

              take: 1,
            },

            citations: {
              orderBy: {
                numero:
                  "asc",
              },

              select: {
                numero: true,
                extrait: true,

                passageRecupere: {
                  select: {
                    chunkId: true,

                    chunk: {
                      select: {
                        reperePassage:
                          true,

                        pageDebut:
                          true,

                        pageFin:
                          true,

                        version: {
                          select: {
                            id: true,
                            numero: true,

                            document: {
                              select: {
                                id: true,
                                titre: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

  if (!conversation) {
    return null;
  }

  /*
   * Un utilisateur ayant changé de société
   * ne doit pas récupérer une conversation
   * de son ancienne société.
   */
  if (
    conversation.societeId !==
    societeId
  ) {
    return null;
  }

  return {
    id:
      conversation.id,

    titre:
      conversation.titre,

    creeLe:
      conversation.creeLe.toISOString(),

    dernierMessageLe:
      conversation.dernierMessageLe.toISOString(),

    messages:
      conversation.messages.map(
        (message) => ({
          id:
            message.id,

          role:
            message.role,

          contenu:
            message.contenu,

          creeLe:
            message.creeLe.toISOString(),

          sourcesInsuffisantes:
            message.executionReponse
              ?.sourcesInsuffisantes ??
            false,

          evaluation:
            message.feedbacks[0]
              ?.evaluation ??
            null,

          citations:
            message.citations.map(
              (citation) => ({
                numero:
                  citation.numero,

                chunkId:
                  citation
                    .passageRecupere
                    .chunkId,

                documentId:
                  citation
                    .passageRecupere
                    .chunk
                    .version
                    .document
                    .id,

                versionId:
                  citation
                    .passageRecupere
                    .chunk
                    .version
                    .id,

                titre:
                  citation
                    .passageRecupere
                    .chunk
                    .version
                    .document
                    .titre,

                numeroVersion:
                  citation
                    .passageRecupere
                    .chunk
                    .version
                    .numero,

                reperePassage:
                  citation
                    .passageRecupere
                    .chunk
                    .reperePassage,

                pageDebut:
                  citation
                    .passageRecupere
                    .chunk
                    .pageDebut,

                pageFin:
                  citation
                    .passageRecupere
                    .chunk
                    .pageFin,

                extrait:
                  citation.extrait,
              }),
            ),
        }),
      ),
  };
}
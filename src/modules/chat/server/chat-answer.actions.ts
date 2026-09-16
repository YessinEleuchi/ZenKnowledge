"use server";

import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";

import { embedQuestion } from
  "@/server/workflows/question-embedding";

import { generateDocumentAnswer } from
  "@/server/workflows/chat-answer";

import {
  getDocumentReadScope,
  getTodayInTunis,
} from "@/modules/documents/server/document.permissions";

import { StatutVersion } from "@/types/enums";

import {
  beginRagTurn,
  completeRagTurn,
  failRagTurn,
  saveRetrievedPassages,
  searchAuthorizedPassages,
} from "./chat.dal";

import type { ChatAnswerResult } from "../chat.types";

const NO_LLM_MODEL = "NO_LLM";

export async function askDocumentQuestion(
  formData: FormData,
): Promise<ChatAnswerResult> {

  const actor = await requireUser();

  const scope = getDocumentReadScope(actor);

  if (!scope) {
    return {
      success: false,
      message:
        "Ton compte ne dispose pas d’un accès documentaire.",
    };
  }
  const rawQuestion =
    formData.get("question");

  const question =
    typeof rawQuestion === "string"
      ? rawQuestion.trim()
      : "";

  if (
    question.length < 3 ||
    question.length > 2000
  ) {
    return {
      success: false,
      message:
        "La question doit contenir entre 3 et 2000 caractères.",
    };
  }

  let executionId: string | null = null;

  const startedAt = Date.now();

  try {

    const turn = await beginRagTurn({
      question,
    });

    executionId = turn.executionId;

 

    const embedding =
      await embedQuestion(question);


    const passages =
      await searchAuthorizedPassages({
        embedding:
          embedding.embedding,

        modeleEmbedding:
          embedding.modeleEmbedding,

        topK: 5,
      });

    await saveRetrievedPassages({
      executionId,
      passages,
    });


    if (passages.length === 0) {
      const reponse =
        "Je n’ai trouvé aucun passage suffisamment pertinent " +
        "dans tes documents accessibles.";

      const completed =
        await completeRagTurn({
          executionId,

          reponse,

          citations: [],

    
          modele:
            NO_LLM_MODEL,

          sourcesInsuffisantes:
            true,

          latenceMs:
            Date.now() - startedAt,

          tokensEntree:
            null,

          tokensSortie:
            null,
        });

      return {
        success: true,


        questionMessageId:
          turn.questionMessageId,

        assistantMessageId:
          completed.assistantMessageId,

        reponse,

        sourcesInsuffisantes:
          true,

        citations: [],
      };
    }

    const answer =
      await generateDocumentAnswer(
        question,
        passages,
      );
    const documents =
      await db.document.findMany({
        where: {
          AND: [
            scope.where,

            {
              id: {
                in: [
                  ...new Set(
                    passages.map(
                      (passage) =>
                        passage.documentId,
                    ),
                  ),
                ],
              },

              dateRevision: {
                gt:
                  getTodayInTunis(),
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

    const allowedVersions =
      new Set(
        documents.flatMap(
          (document) => {
            const latest =
              document.versions[0];

            return latest?.statut ===
              StatutVersion.PUBLIEE
              ? [latest.id]
              : [];
          },
        ),
      );
    if (
      passages.some(
        (passage) =>
          !allowedVersions.has(
            passage.versionId,
          ),
      )
    ) {
      await failRagTurn(
        executionId,
      );

      return {
        success: false,

        message:
          "Les documents ont changé pendant la recherche. " +
          "Relance ta question.",
      };
    }

    const completed =
      await completeRagTurn({
        executionId,

        reponse:
          answer.reponse,

        citations:
          answer.citations,

        modele:
          answer.modele,

        sourcesInsuffisantes:
          answer.sourcesInsuffisantes,

        latenceMs:
          Date.now() - startedAt,

        tokensEntree:
          answer.tokensEntree,

        tokensSortie:
          answer.tokensSortie,
      });
    return {
      success: true,

      questionMessageId:
        turn.questionMessageId,

      assistantMessageId:
        completed.assistantMessageId,

      reponse:
        answer.reponse,

      sourcesInsuffisantes:
        answer.sourcesInsuffisantes,

      citations:
        answer.citations,
    };
  } catch (error) {
    console.error(
      "Échec du chat documentaire :",
      error,
    );

    if (executionId) {
      try {
        await failRagTurn(
          executionId,
        );
      } catch (failureError) {
        console.error(
          "Impossible de marquer l’exécution RAG en échec :",
          failureError,
        );
      }
    }

    return {
      success: false,

      message:
        "La réponse n’a pas pu être produite ou vérifiée. " +
        "Réessaie dans quelques instants.",
    };
  }
}
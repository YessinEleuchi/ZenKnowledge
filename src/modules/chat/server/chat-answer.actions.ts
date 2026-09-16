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

import { searchAuthorizedPassages } from "./chat.dal";
import type { ChatAnswerResult } from "../chat.types";

export async function askDocumentQuestion(
  formData: FormData,
): Promise<ChatAnswerResult> {
  // Préserver les redirections d’authentification.
  const actor = await requireUser();
  const scope = getDocumentReadScope(actor);

  if (!scope) {
    return {
      success: false,
      message: "Ton compte ne dispose pas d’un accès documentaire.",
    };
  }

  const value = formData.get("question");
  const question = typeof value === "string" ? value.trim() : "";

  if (question.length < 3 || question.length > 2000) {
    return {
      success: false,
      message: "La question doit contenir entre 3 et 2000 caractères.",
    };
  }

  try {
    const embedding = await embedQuestion(question);

    const passages = await searchAuthorizedPassages({
      embedding: embedding.embedding,
      modeleEmbedding: embedding.modeleEmbedding,
      topK: 5,
    });

    if (passages.length === 0) {
      return {
        success: true,
        reponse:
          "Je n’ai trouvé aucun passage suffisamment pertinent " +
          "dans tes documents accessibles.",
        sourcesInsuffisantes: true,
        citations: [],
      };
    }

    const answer = await generateDocumentAnswer(question, passages);

    // Vérifier que les documents utilisés sont encore accessibles
    // et que leur version reste la dernière version publiée.
    const documents = await db.document.findMany({
      where: {
        AND: [
          scope.where,
          {
            id: {
              in: [...new Set(passages.map((p) => p.documentId))],
            },
            dateRevision: { gt: getTodayInTunis() },
          },
        ],
      },
      select: {
        versions: {
          orderBy: { numero: "desc" },
          take: 1,
          select: { id: true, statut: true },
        },
      },
    });

    const allowedVersions = new Set(
      documents.flatMap((document) => {
        const latest = document.versions[0];

        return latest?.statut === StatutVersion.PUBLIEE
          ? [latest.id]
          : [];
      }),
    );

    if (passages.some((p) => !allowedVersions.has(p.versionId))) {
      return {
        success: false,
        message:
          "Les documents ont changé pendant la recherche. " +
          "Relance ta question.",
      };
    }

    return {
      success: true,
      reponse: answer.reponse,
      sourcesInsuffisantes: answer.sourcesInsuffisantes,
      citations: answer.citations,
    };
  } catch (error) {
    console.error("Échec du chat documentaire :", error);

    return {
      success: false,
      message:
        "La réponse n’a pas pu être produite ou vérifiée. " +
        "Réessaie dans quelques instants.",
    };
  }
}
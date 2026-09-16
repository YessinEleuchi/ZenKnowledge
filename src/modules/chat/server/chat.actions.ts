"use server";

import { requireUser } from "@/server/auth/session";
import { embedQuestion } from "@/server/workflows/question-embedding";
import { getDocumentReadScope } from
  "@/modules/documents/server/document.permissions";

import { searchAuthorizedPassages } from "./chat.dal";
import type { ChatSearchState } from "../chat.types";

export async function searchPassagesAction(
  _previousState: ChatSearchState,
  formData: FormData,
): Promise<ChatSearchState> {
  // Garder les redirections d’authentification hors du catch.
  const actor = await requireUser();

  if (!getDocumentReadScope(actor)) {
    return {
      success: false,
      message: "Ton compte ne dispose pas d’un accès documentaire.",
      passages: [],
    };
  }

  const rawQuestion = formData.get("question");
  const question =
    typeof rawQuestion === "string" ? rawQuestion.trim() : "";

  if (question.length < 3 || question.length > 2000) {
    return {
      success: false,
      message: "La question doit contenir entre 3 et 2000 caractères.",
      passages: [],
    };
  }

  try {
    const result = await embedQuestion(question);

    const passages = await searchAuthorizedPassages({
      embedding: result.embedding,
      modeleEmbedding: result.modeleEmbedding,
      topK: 5,
    });

    return {
  success: true,
  message:
    passages.length > 0
      ? `${passages.length} passage(s) pertinent(s) retrouvé(s).`
      : "Aucun passage suffisamment pertinent dans tes documents accessibles.",
  passages,
};
  } catch (error) {
    console.error("Échec de la recherche documentaire :", error);

    return {
      success: false,
      message: "La recherche a échoué. Réessaie dans quelques instants.",
      passages: [],
    };
  }
}
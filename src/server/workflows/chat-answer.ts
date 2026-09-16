import "server-only";

import { z } from "zod";

import type { RetrievedPassage } from
  "@/modules/chat/server/chat.dal";
import type { ChatCitation } from
  "@/modules/chat/chat.types";

const INSUFFICIENT_MESSAGE =
  "Les documents accessibles ne contiennent pas suffisamment " +
  "d’informations pour répondre à cette question.";

const responseSchema = z.object({
  reponse: z.string().trim().min(1).max(10_000),
  sourcesInsuffisantes: z.boolean(),
  citations: z.array(
    z.object({
      numero: z.number().int().min(1).max(5),
      extrait: z.string().trim().min(1).max(500),
    }).strict(),
  ).max(5),
  modele: z.string().min(1).max(200),
  tokensEntree: z.number().int().nonnegative().nullable(),
  tokensSortie: z.number().int().nonnegative().nullable(),
}).strict();

function normalize(value: string) {
  return value.normalize("NFC").replace(/\s+/g, " ").trim();
}

export async function generateDocumentAnswer(
  question: string,
  passages: RetrievedPassage[],
) {
  if (passages.length < 1 || passages.length > 5) {
    throw new Error("Nombre de passages invalide.");
  }

  const url = process.env.N8N_ANSWER_URL;
  const secret = process.env.N8N_WEBHOOK_SECRET;

  if (!url || !secret) {
    throw new Error("Configuration du workflow de réponse manquante.");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-workflow-secret": secret,
    },
    body: JSON.stringify({
      question,
      passages: passages.map((passage, index) => ({
        numero: index + 1,
        contenu: passage.contenu,
      })),
    }),
    signal: AbortSignal.timeout(60_000),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Workflow de réponse : HTTP ${response.status}.`);
  }

  const result = responseSchema.parse(await response.json());

  const references = new Set(
    [...result.reponse.matchAll(/\[(\d+)\]/g)].map(
      (match) => Number(match[1]),
    ),
  );

  if (result.sourcesInsuffisantes) {
    if (result.citations.length > 0 || references.size > 0) {
      throw new Error("Réponse d’abstention incohérente.");
    }

    return {
      ...result,
      reponse: INSUFFICIENT_MESSAGE,
      citations: [] as ChatCitation[],
    };
  }

  if (result.citations.length === 0) {
    throw new Error("Réponse sans preuve documentaire.");
  }

  const seen = new Set<number>();

  const citations: ChatCitation[] = result.citations.map(
    (citation) => {
      const passage = passages[citation.numero - 1];

      if (
        !passage ||
        seen.has(citation.numero) ||
        !normalize(passage.contenu).includes(
          normalize(citation.extrait),
        )
      ) {
        throw new Error("Citation invalide ou extrait absent.");
      }

      seen.add(citation.numero);

      return {
        numero: citation.numero,
        chunkId: passage.chunkId,
        documentId: passage.documentId,
        versionId: passage.versionId,
        titre: passage.titre,
        numeroVersion: passage.numeroVersion,
        reperePassage: passage.reperePassage,
        pageDebut: passage.pageDebut,
        pageFin: passage.pageFin,
        extrait: citation.extrait,
      };
    },
  );

  if (
    [...references].some((numero) => !seen.has(numero)) ||
    [...seen].some((numero) => !references.has(numero))
  ) {
    throw new Error("Références et citations incohérentes.");
  }

  return {
    ...result,
    citations: citations.sort((a, b) => a.numero - b.numero),
  };
}
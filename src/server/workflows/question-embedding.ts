import "server-only";

import { z } from "zod";

const responseSchema = z.object({
  modeleEmbedding: z.literal("gemini-embedding-2"),
  embedding: z
    .array(z.number().finite().min(-1_000_000).max(1_000_000))
    .length(768)
    .refine(
      (values) => values.some((value) => Math.abs(value) > 1e-12),
      "Vecteur nul.",
    ),
});

export async function embedQuestion(question: string) {
  const url = process.env.N8N_QUESTION_EMBEDDING_URL;
  const secret = process.env.N8N_WEBHOOK_SECRET;

  if (!url || !secret) {
    throw new Error("Configuration du workflow W2 manquante.");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-workflow-secret": secret,
    },
    body: JSON.stringify({ question }),
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Échec du workflow d’embedding : HTTP ${response.status}.`,
    );
  }

  return responseSchema.parse(await response.json());
}
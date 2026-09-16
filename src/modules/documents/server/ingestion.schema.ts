import "server-only";

import { z } from "zod";

const chunkSchema = z.object({
  position: z.number().int().min(1),

  contenu: z.string().trim().min(1).max(1500),

  embedding: z
    .array(
      z.number().finite().min(-1_000_000).max(1_000_000),
    )
    .length(768)
    .refine(
      (values) => values.some((value) => Math.abs(value) > 1e-12),
      "Le vecteur ne doit pas être nul.",
    ),
}).strict();

export const completeIngestionSchema = z
  .object({
    executionId: z.string().uuid(),
    versionId: z.string().uuid(),
    modeleEmbedding: z.literal("gemini-embedding-2"),
    totalChunks: z.number().int().min(1).max(200),
    chunks: z.array(chunkSchema).min(1).max(200),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.totalChunks !== data.chunks.length) {
      ctx.addIssue({
        code: "custom",
        path: ["totalChunks"],
        message: "Le nombre de chunks est incohérent.",
      });
    }

    const positions = data.chunks
      .map((chunk) => chunk.position)
      .sort((a, b) => a - b);

    if (positions.some((position, index) => position !== index + 1)) {
      ctx.addIssue({
        code: "custom",
        path: ["chunks"],
        message: "Les positions doivent être uniques et continues depuis 1.",
      });
    }
  });
import "server-only";

import { z } from "zod";

const chunkSchema = z
  .object({
    position: z.number().int().min(1).max(200),

    contenu: z.string().trim().min(1).max(1500),

    pageDebut: z.number().int().min(1).max(2_147_483_647),

    pageFin: z.number().int().min(1).max(2_147_483_647),

    reperePassage: z.string().trim().min(1).max(200),

    embedding: z
      .array(
        z.number().finite().min(-1_000_000).max(1_000_000),
      )
      .length(768)
      .refine(
        (values) => Math.hypot(...values) >= 1e-12,
        "Le vecteur ne doit pas être nul.",
      ),
  })
  .strict()
  .superRefine((chunk, ctx) => {
    if (chunk.pageFin !== chunk.pageDebut) {
      ctx.addIssue({
        code: "custom",
        path: ["pageFin"],
        message: "Chaque chunk doit appartenir à une seule page.",
      });
    }
  });

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

    const ordered = [...data.chunks].sort(
      (a, b) => a.position - b.position,
    );

    if (
      ordered.some(
        (chunk, index) => chunk.position !== index + 1,
      )
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["chunks"],
        message:
          "Les positions doivent être uniques et continues depuis 1.",
      });
    }

    if (
      ordered.some(
        (chunk, index) =>
          index > 0 &&
          chunk.pageDebut < ordered[index - 1].pageDebut,
      )
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["chunks"],
        message: "Les pages doivent suivre l’ordre des passages.",
      });
    }
  });

export type CompleteIngestionInput = z.infer<
  typeof completeIngestionSchema
>;
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { isInternalWorkflowRequest } from
  "@/server/workflows/internal-auth";

import {
  completeIngestion,
  IngestionConflictError,
} from "@/modules/documents/server/ingestion.dal";

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
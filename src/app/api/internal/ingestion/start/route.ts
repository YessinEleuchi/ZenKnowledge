import { revalidatePath } from "next/cache";

import { isInternalWorkflowRequest } from
  "@/server/workflows/internal-auth";
import {
  claimIngestion,
  failIngestion,
  IngestionConflictError,
} from "@/modules/documents/server/ingestion.dal";
import { readStoredPdf } from "@/server/storage/s3";

export const runtime = "nodejs";

const UUID =
  /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!isInternalWorkflowRequest(request)) {
    return Response.json(
      { error: "Accès refusé." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);

  if (
    typeof body?.executionId !== "string" ||
    typeof body?.versionId !== "string" ||
    !UUID.test(body.executionId) ||
    !UUID.test(body.versionId)
  ) {
    return Response.json(
      { error: "Identifiants invalides." },
      { status: 400 },
    );
  }

  const { executionId, versionId } = body;
  let claimed = false;

  try {
    const version = await claimIngestion(executionId, versionId);
    claimed = true;

    const pdf = await readStoredPdf(version.cleStockage);

    revalidatePath("/documents");

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="document.pdf"',
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof IngestionConflictError) {
      return Response.json(
        { error: error.message },
        { status: 409 },
      );
    }

    console.error("Démarrage de l’ingestion impossible :", error);

    if (claimed) {
      try {
        await failIngestion(
          executionId,
          versionId,
          "Impossible de récupérer le PDF depuis le stockage.",
        );

        revalidatePath("/documents");
      } catch (trackingError) {
        console.error(
          "Impossible d’enregistrer l’échec :",
          trackingError,
        );
      }
    }

    return Response.json(
      { error: "Impossible de récupérer le document." },
      { status: 500 },
    );
  }
}
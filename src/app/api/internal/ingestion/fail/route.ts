import { revalidatePath } from "next/cache";

import { isInternalWorkflowRequest } from
  "@/server/workflows/internal-auth";
import { failIngestion } from
  "@/modules/documents/server/ingestion.dal";

export const runtime = "nodejs";

const UUID =
  /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

const ERROR_MESSAGES = {
  NO_EXTRACTABLE_TEXT:
    "Aucun texte extractible. Le PDF est peut-être scanné ou vide.",
  PDF_EXTRACTION_FAILED:
    "Impossible d’extraire le texte du PDF. Le fichier peut être protégé ou endommagé.",
} as const;

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
    !UUID.test(body.versionId) ||
    (
      body.code !== "NO_EXTRACTABLE_TEXT" &&
      body.code !== "PDF_EXTRACTION_FAILED"
    )
  ) {
    return Response.json(
      { error: "Paramètres invalides." },
      { status: 400 },
    );
  }

  const code = body.code as keyof typeof ERROR_MESSAGES;

  try {
    const updated = await failIngestion(
      body.executionId,
      body.versionId,
      ERROR_MESSAGES[code],
    );

    if (!updated) {
      return Response.json(
        { error: "Exécution non modifiable." },
        { status: 409 },
      );
    }

    revalidatePath("/documents");

    return Response.json({ success: true });
  } catch (error) {
    console.error("Enregistrement de l’échec impossible :", error);

    return Response.json(
      { error: "Erreur interne." },
      { status: 500 },
    );
  }
}
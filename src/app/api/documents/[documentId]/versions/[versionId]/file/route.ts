import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { readStoredPdf } from "@/server/storage/s3";
import { Role } from "@/generated/prisma/enums";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

function errorResponse(message: string, status: number) {
  return Response.json(
    { message },
    {
      status,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      documentId: string;
      versionId: string;
    }>;
  },
) {
  const user = await getCurrentUser();

  if (!user) {
    return errorResponse("Authentification requise.", 401);
  }

  if (user.role !== Role.GESTIONNAIRE || !user.societeId) {
    return errorResponse("Accès refusé.", 403);
  }

  const { documentId, versionId } = await context.params;

  if (!UUID.test(documentId) || !UUID.test(versionId)) {
    return errorResponse("Fichier introuvable.", 404);
  }

  const version = await db.versionDocument.findFirst({
    where: {
      id: versionId,
      documentId,
      document: {
        societeId: user.societeId,
        supprimeLe: null,
      },
    },
    select: {
      cleStockage: true,
      nomFichier: true,
    },
  });

  if (!version) {
    return errorResponse("Fichier introuvable.", 404);
  }

  const expectedKey =
    `societes/${user.societeId}` +
    `/documents/${documentId}/${versionId}.pdf`;

  if (version.cleStockage !== expectedKey) {
    return errorResponse("Fichier inaccessible.", 404);
  }

  try {
    const bytes = await readStoredPdf(version.cleStockage);
    const download =
      new URL(request.url).searchParams.get("download") === "1";

    const filename =
      version.nomFichier
        .replace(/[\\/\u0000-\u001f\u007f]/g, "_")
        .slice(0, 255) || "document.pdf";

    const encodedFilename = encodeURIComponent(filename).replace(
      /['()*]/g,
      (character) =>
        `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    );

    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition":
          `${download ? "attachment" : "inline"}; ` +
          `filename="document.pdf"; filename*=UTF-8''${encodedFilename}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
        "Content-Security-Policy": "frame-ancestors 'self'",
      },
    });
  } catch (error) {
    console.error("Lecture PDF impossible :", error);

    return errorResponse(
      "Le fichier est momentanément indisponible.",
      503,
    );
  }
}
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { readStoredPdf } from "@/server/storage/s3";

import {
  getDocumentReadScope,
  isPublishedVersion,
} from "@/modules/documents/server/document.permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

function errorResponse(message: string, status: number) {
  return Response.json(
    { message },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
      },
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

  const scope = getDocumentReadScope(user);

  if (!scope || !user.societeId) {
    return errorResponse("Accès refusé.", 403);
  }

  const { documentId, versionId } = await context.params;

  if (!UUID.test(documentId) || !UUID.test(versionId)) {
    return errorResponse("Fichier introuvable.", 404);
  }

  try {
    const document = await db.document.findFirst({
      where: {
        AND: [
          scope.where,
          {
            id: documentId,
          },
        ],
      },

      select: {
        versions: {
          // Collaborateur : sélectionner la dernière version réelle.
          // Gestionnaire : sélectionner la version demandée.
          ...(scope.latestVersionOnly
            ? {}
            : {
                where: {
                  id: versionId,
                },
              }),

          orderBy: {
            numero: "desc",
          },

          take: 1,

          select: {
            id: true,
            statut: true,
            cleStockage: true,
            nomFichier: true,
          },
        },
      },
    });

    const version = document?.versions[0];

    if (!version || version.id !== versionId) {
      return errorResponse("Fichier introuvable.", 404);
    }

    if (
      scope.latestVersionOnly &&
      !isPublishedVersion(version)
    ) {
      return errorResponse("Fichier introuvable.", 404);
    }

    const expectedKey =
      `societes/${user.societeId}` +
      `/documents/${documentId}/${versionId}.pdf`;

    if (version.cleStockage !== expectedKey) {
      return errorResponse("Fichier introuvable.", 404);
    }

    // Lecture du stockage uniquement après les contrôles d’accès.
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
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { readStoredPdf } from "@/server/storage/s3";
import {
  getDocumentReadScope,
  isPublishedVersion,
} from "@/modules/documents/server/document.permissions";

export const runtime = "nodejs";

const UUID =
  /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      documentId: string;
      versionId: string;
    }>;
  },
) {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Authentification requise.", {
      status: 401,
      headers: privateHeaders,
    });
  }

  const scope = getDocumentReadScope(user);
  const { documentId, versionId } = await context.params;

  if (
    !scope ||
    !UUID.test(documentId) ||
    !UUID.test(versionId)
  ) {
    return new Response("Source indisponible.", {
      status: 404,
      headers: privateHeaders,
    });
  }

  const version = await db.versionDocument.findFirst({
    where: {
      id: versionId,
      documentId,
      document: {
        is: scope.where,
      },
    },
    select: {
      id: true,
      cleStockage: true,
      document: {
        select: {
          versions: {
            orderBy: { numero: "desc" },
            take: 1,
            select: {
              id: true,
              statut: true,
            },
          },
        },
      },
    },
  });

  if (!version) {
    return new Response("Source indisponible.", {
      status: 404,
      headers: privateHeaders,
    });
  }

  // Collaborateur : uniquement la dernière version publiée.
  // Gestionnaire : accès à l’historique selon ses permissions.
  if (scope.latestVersionOnly) {
    const latest = version.document.versions[0];

    if (
      latest?.id !== version.id ||
      !isPublishedVersion(latest)
    ) {
      return new Response("Source indisponible.", {
        status: 404,
        headers: privateHeaders,
      });
    }
  }

  try {
    const bytes = await readStoredPdf(version.cleStockage);

    return new Response(new Uint8Array(bytes), {
      headers: {
        ...privateHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="document.pdf"',
        "Content-Length": String(bytes.byteLength),
        "X-Frame-Options": "SAMEORIGIN",
        "Content-Security-Policy": "frame-ancestors 'self'",
      },
    });
  } catch (error) {
    console.error("Échec de lecture du PDF :", error);

    return new Response("Le PDF est temporairement indisponible.", {
      status: 503,
      headers: privateHeaders,
    });
  }
}
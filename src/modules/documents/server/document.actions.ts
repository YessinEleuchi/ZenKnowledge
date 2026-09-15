"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireCompanyManager } from "@/server/auth/session";
import {
  uploadPdf,
  deleteStoredFile,
} from "@/server/storage/s3";
import {
  createDocumentRecord,
  isDocumentServiceAllowed,
} from "@/modules/documents/server/document.dal";

type UploadState = {
  success: boolean;
  message: string;
};

const MAX_PDF_SIZE = 3 * 1024 * 1024;

function textField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
}

export async function createDocument(
  _previousState: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const actor = await requireCompanyManager();

  const titre = textField(formData, "titre");
  const serviceId = textField(formData, "serviceId") || null;
  const dateRevision = parseDate(
    textField(formData, "dateRevision"),
  );
  const accessibleCollaborateurs =
    formData.get("accessibleCollaborateurs") === "on";

  const fichier = formData.get("fichier");

  if (titre.length < 3 || titre.length > 200) {
    return {
      success: false,
      message: "Le titre doit contenir entre 3 et 200 caractères.",
    };
  }

  if (!dateRevision) {
    return {
      success: false,
      message: "La date de révision est invalide.",
    };
  }

  if (!(fichier instanceof File) || fichier.size === 0) {
    return {
      success: false,
      message: "Sélectionne un fichier PDF non vide.",
    };
  }

  if (fichier.size > MAX_PDF_SIZE) {
    return {
      success: false,
      message: "Le fichier ne doit pas dépasser 3 Mo.",
    };
  }

  if (!fichier.name.toLowerCase().endsWith(".pdf")) {
    return {
      success: false,
      message: "Seuls les fichiers PDF sont acceptés.",
    };
  }

  if (
    serviceId &&
    !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(serviceId)
  ) {
    return {
      success: false,
      message: "Le service sélectionné est invalide.",
    };
  }

  try {
    if (!(await isDocumentServiceAllowed(serviceId))) {
  return {
    success: false,
    message: "Ce service n’appartient pas à ta société.",
  };
}

    const body = Buffer.from(await fichier.arrayBuffer());

    // Contrôle de signature ; l’analyse complète aura lieu à l’ingestion.
    if (body.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return {
        success: false,
        message: "Le fichier ne possède pas une signature PDF valide.",
      };
    }

    const documentId = randomUUID();
    const versionId = randomUUID();

    const cleStockage =
      `societes/${actor.societeId}` +
      `/documents/${documentId}/${versionId}.pdf`;

    const nomFichier =
      fichier.name
        .split(/[\\/]/)
        .pop()!
        .replace(/[\u0000-\u001f\u007f]/g, "")
        .slice(0, 255) || "document.pdf";

    await uploadPdf(cleStockage, body);

    try {
      // L’écriture imbriquée crée le document et sa version atomiquement.
     await uploadPdf(cleStockage, body);

try {
  await createDocumentRecord({
    documentId,
    versionId,
    titre,
    serviceId,
    dateRevision,
    accessibleCollaborateurs,
    cleStockage,
    nomFichier,
  });
} catch (error) {
  try {
    await deleteStoredFile(cleStockage);
  } catch (cleanupError) {
    console.error(
      "Fichier orphelin à nettoyer :",
      cleStockage,
      cleanupError,
    );
  }

  throw error;
}
    } catch (error) {
      // Compensation si le stockage réussit mais que Prisma échoue.
      try {
        await deleteStoredFile(cleStockage);
      } catch (cleanupError) {
        console.error(
          "Fichier orphelin à nettoyer :",
          cleStockage,
          cleanupError,
        );
      }

      throw error;
    }
  } catch (error) {
    console.error("Échec du dépôt du document :", error);

    return {
      success: false,
      message:
        "Le dépôt a échoué. Vérifie le stockage et la base de données.",
    };
  }

  revalidatePath("/documents");

  return {
    success: true,
    message: "Document ajouté. Sa première version est en attente.",
  };
}
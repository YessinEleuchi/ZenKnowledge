"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireCompanyManager } from "@/server/auth/session";
import { uploadPdf, deleteStoredFile } from "@/server/storage/s3";

import {
  assertDocumentCanBeEdited,
  createDocumentRecord,
  DocumentInputError,
  isDocumentServiceAllowed,
  updateDocumentRecord,
} from "./document.dal";

import type { DocumentActionState } from "../document.types";

const MAX_PDF_SIZE = 3 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

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

async function saveDocument(
  mode: "create" | "update",
  formData: FormData,
): Promise<DocumentActionState> {
  // Hors du catch : conserver les redirections d’authentification.
  const actor = await requireCompanyManager();

  let uploadedKey: string | null = null;

  try {
    const titre = textField(formData, "titre");
    const serviceId = textField(formData, "serviceId") || null;
    const dateRevision = parseDate(
      textField(formData, "dateRevision"),
    );

    const accessibleCollaborateurs =
      formData.get("accessibleCollaborateurs") === "on";

    const documentId =
      mode === "create"
        ? randomUUID()
        : textField(formData, "documentId");

    const expectedVersionId =
      textField(formData, "expectedVersionId") || null;

    if (!UUID.test(documentId)) {
      throw new DocumentInputError("Document invalide.");
    }

    if (expectedVersionId && !UUID.test(expectedVersionId)) {
      throw new DocumentInputError("Version invalide.");
    }

    if (titre.length < 3 || titre.length > 200) {
      throw new DocumentInputError(
        "Le titre doit contenir entre 3 et 200 caractères.",
      );
    }

    if (!dateRevision) {
      throw new DocumentInputError(
        "La date de révision est invalide.",
      );
    }

    if (serviceId && !UUID.test(serviceId)) {
      throw new DocumentInputError("Le service est invalide.");
    }

    if (mode === "update") {
      await assertDocumentCanBeEdited(documentId);
    }

    if (!(await isDocumentServiceAllowed(serviceId))) {
      throw new DocumentInputError(
        "Ce service n’appartient pas à ta société.",
      );
    }

    const fichier = formData.get("fichier");

    if (fichier !== null && !(fichier instanceof File)) {
      throw new DocumentInputError("Le fichier est invalide.");
    }

    const hasFile =
      fichier instanceof File &&
      (fichier.name !== "" || fichier.size > 0);

    if (mode === "create" && !hasFile) {
      throw new DocumentInputError("Sélectionne un PDF.");
    }

    let newVersion: {
      versionId: string;
      cleStockage: string;
      nomFichier: string;
    } | null = null;

    if (fichier instanceof File && hasFile) {
      if (fichier.size === 0) {
        throw new DocumentInputError("Le PDF est vide.");
      }

      if (fichier.size > MAX_PDF_SIZE) {
        throw new DocumentInputError(
          "Le PDF ne doit pas dépasser 3 Mo.",
        );
      }

      if (!fichier.name.toLowerCase().endsWith(".pdf")) {
        throw new DocumentInputError(
          "Seuls les fichiers PDF sont acceptés.",
        );
      }

      const body = Buffer.from(await fichier.arrayBuffer());

      if (body.subarray(0, 5).toString("ascii") !== "%PDF-") {
        throw new DocumentInputError(
          "Le fichier ne possède pas une signature PDF valide.",
        );
      }

      const versionId = randomUUID();
      const cleStockage =
        `societes/${actor.societeId}` +
        `/documents/${documentId}/${versionId}.pdf`;

      const nomFichier =
        fichier.name
          .split(/[\\/]/)
          .pop()
          ?.replace(/[\u0000-\u001f\u007f]/g, "")
          .slice(0, 255) || "document.pdf";

      await uploadPdf(cleStockage, body);
      uploadedKey = cleStockage;

      newVersion = {
        versionId,
        cleStockage,
        nomFichier,
      };
    }

    const fields = {
      documentId,
      titre,
      serviceId,
      dateRevision,
      accessibleCollaborateurs,
    };

    if (mode === "create") {
      if (!newVersion) {
        throw new DocumentInputError("Sélectionne un PDF.");
      }

      await createDocumentRecord({
        ...fields,
        ...newVersion,
      });
    } else {
      await updateDocumentRecord({
        ...fields,
        expectedVersionId,
        newVersion,
      });
    }

    // À partir d’ici, le fichier est référencé en base.
    uploadedKey = null;
  } catch (error) {
    if (uploadedKey) {
      try {
        await deleteStoredFile(uploadedKey);
      } catch (cleanupError) {
        console.error(
          "Fichier orphelin à nettoyer :",
          uploadedKey,
          cleanupError,
        );
      }
    }

    if (error instanceof DocumentInputError) {
      return { success: false, message: error.message };
    }

    console.error("Échec de l’enregistrement :", error);

    return {
      success: false,
      message:
        "L’enregistrement a échoué. Réessaie dans quelques instants.",
    };
  }

  revalidatePath("/documents");

  return {
    success: true,
    message:
      mode === "create"
        ? "Document ajouté. Sa première version est en attente."
        : "Modifications enregistrées.",
  };
}

export async function createDocument(
  _previousState: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  return saveDocument("create", formData);
}

export async function updateDocument(
  _previousState: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  return saveDocument("update", formData);
}
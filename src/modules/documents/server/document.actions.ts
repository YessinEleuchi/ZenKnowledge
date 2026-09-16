"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { requireCompanyManager } from "@/server/auth/session";

import {
  uploadPdf,
  deleteStoredFile,
} from "@/server/storage/s3";

import { triggerDocumentIngestion } from
  "@/server/workflows/ingestion";

import {
  assertDocumentCanBeEdited,
  createDocumentRecord,
  DocumentInputError,
  isDocumentServiceAllowed,
  prepareDocumentIngestion,
  recordIngestionDispatchIssue,
  updateDocumentRecord,
} from "./document.dal";

import type { DocumentActionState } from "../document.types";

const MAX_PDF_SIZE = 3 * 1024 * 1024;

const UUID =
  /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

type NewDocumentVersion = {
  versionId: string;
  cleStockage: string;
  nomFichier: string;
};

function textField(formData: FormData, name: string): string {
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

function optionalPdfField(formData: FormData): File | null {
  const value = formData.get("fichier");

  if (value === null) {
    return null;
  }

  if (!(value instanceof File)) {
    throw new DocumentInputError("Le fichier est invalide.");
  }

  // Aucun fichier sélectionné dans le formulaire.
  if (value.name === "" && value.size === 0) {
    return null;
  }

  // Un véritable fichier sélectionné, même vide,
  // sera soumis aux validations ci-dessous.
  return value;
}

async function saveDocument(
  mode: "create" | "update",
  formData: FormData,
): Promise<DocumentActionState> {
  // Hors du catch pour préserver la redirection d’authentification.
  // Création et modification restent réservées aux gestionnaires.
  const actor = await requireCompanyManager();

  let uploadedKey: string | null = null;
  let versionToIngest: string | null = null;

  try {
    const titre = textField(formData, "titre");

    const serviceId =
      textField(formData, "serviceId") || null;

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

    if (
      expectedVersionId !== null &&
      !UUID.test(expectedVersionId)
    ) {
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

    if (serviceId !== null && !UUID.test(serviceId)) {
      throw new DocumentInputError(
        "Le service est invalide.",
      );
    }

    if (mode === "update") {
      await assertDocumentCanBeEdited(documentId);
    }

    if (!(await isDocumentServiceAllowed(serviceId))) {
      throw new DocumentInputError(
        "Ce service n’appartient pas à ta société.",
      );
    }

    const fichier = optionalPdfField(formData);

    // Le PDF est obligatoire uniquement à la création.
    if (mode === "create" && fichier === null) {
      throw new DocumentInputError("Sélectionne un PDF.");
    }

    // En modification, null signifie :
    // conserver le PDF et la version actuels.
    let newVersion: NewDocumentVersion | null = null;

    if (fichier !== null) {
      if (fichier.size === 0) {
        throw new DocumentInputError(
          "Le fichier PDF sélectionné est vide.",
        );
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

      const body = Buffer.from(
        await fichier.arrayBuffer(),
      );

      // Contrôle de signature.
      // L’analyse du contenu est réalisée pendant l’ingestion.
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
      if (newVersion === null) {
        throw new DocumentInputError("Sélectionne un PDF.");
      }

      await createDocumentRecord({
        ...fields,
        ...newVersion,
      });
    } else {
      // Sans nouveau PDF, le DAL modifie uniquement
      // les informations du document.
      await updateDocumentRecord({
        ...fields,
        expectedVersionId,
        newVersion,
      });
    }

    // L’écriture en base a réussi :
    // le fichier téléversé est maintenant référencé.
    uploadedKey = null;

    // Aucun nouveau PDF = aucune ingestion.
    versionToIngest = newVersion?.versionId ?? null;
  } catch (error) {
    // Compensation uniquement pour le nouveau fichier téléversé.
    // Le PDF existant n’est jamais supprimé ici.
    if (uploadedKey !== null) {
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
      return {
        success: false,
        message: error.message,
      };
    }

    console.error(
      "Échec de l’enregistrement du document :",
      error,
    );

    return {
      success: false,
      message:
        "L’enregistrement a échoué. Réessaie dans quelques instants.",
    };
  }

  // Les informations sont enregistrées.
  // Sans nouveau PDF, aucun appel au workflow n’est nécessaire.
  if (versionToIngest === null) {
    revalidatePath("/documents");

    return {
      success: true,
      message:
        "Modifications enregistrées. Le PDF actuel a été conservé.",
    };
  }

  let ingestionDispatchConfirmed = false;
  let executionId: string | null = null;

  try {
    const ingestion = await prepareDocumentIngestion(
      versionToIngest,
    );

    executionId = ingestion.executionId;

    await triggerDocumentIngestion(ingestion);

    ingestionDispatchConfirmed = true;
  } catch (error) {
    console.error(
      "Préparation ou déclenchement de l’ingestion non confirmé :",
      versionToIngest,
      error,
    );

    if (executionId !== null) {
      try {
        await recordIngestionDispatchIssue(executionId);
      } catch (trackingError) {
        console.error(
          "Impossible d’enregistrer le problème de déclenchement :",
          executionId,
          trackingError,
        );
      }
    }
  }

  revalidatePath("/documents");

  if (!ingestionDispatchConfirmed) {
    return {
      success: true,
      message:
        "Document enregistré. Le lancement du traitement n’a pas pu être confirmé.",
    };
  }

  return {
    success: true,
    message:
      mode === "create"
        ? "Document ajouté. Demande d’ingestion transmise."
        : "Nouvelle version enregistrée. Demande d’ingestion transmise.",
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
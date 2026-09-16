import { redirect } from "next/navigation";

import { DocumentsLibrary } from
  "@/modules/documents/components/document-library";

import {
  getDocumentCreationOptions,
  listDocuments,
} from "@/modules/documents/server/document.dal";

import { requireUser } from "@/server/auth/session";
import { Role } from "@/types/enums";

export const runtime = "nodejs";

export default async function DocumentsPage() {
  const user = await requireUser();

  const canConsultDocuments =
    Boolean(user.societeId) &&
    (
      user.role === Role.GESTIONNAIRE ||
      user.role === Role.COLLABORATEUR
    );

  if (!canConsultDocuments) {
    redirect("/dashboard");
  }

  const canManageDocuments =
    user.role === Role.GESTIONNAIRE &&
    Boolean(user.societeId);

  const [documents, options] = await Promise.all([
    listDocuments(),

    canManageDocuments
      ? getDocumentCreationOptions()
      : Promise.resolve({ services: [] }),
  ]);

  return (
    <DocumentsLibrary
      documents={documents}
      services={options.services}
      canManageDocuments={canManageDocuments}
    />
  );
}
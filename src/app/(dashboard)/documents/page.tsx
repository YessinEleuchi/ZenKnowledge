import { DocumentsLibrary } from "@/modules/documents/components/document-library";

import {
  getDocumentCreationOptions,
  listDocuments,
} from "@/modules/documents/server/document.dal";

export const runtime = "nodejs";

export default async function DocumentsPage() {
  const [options, documents] = await Promise.all([
    getDocumentCreationOptions(),
    listDocuments(),
  ]);

  return (
    <DocumentsLibrary
      documents={documents}
      services={options.services}
    />
  );
}
import { DocumentForm } from
  "@/modules/documents/components/document-form";
import { DocumentsLibrary } from
  "@/modules/documents/components/documents-library";
import {
  getDocumentCreationOptions,
  listDocuments,
} from "@/modules/documents/server/document.dal";

export default async function DocumentsPage() {
  const [options, documents] = await Promise.all([
    getDocumentCreationOptions(),
    listDocuments(),
  ]);

  return (
    <DocumentsLibrary
      documents={documents}
      uploadForm={<DocumentForm services={options.services} />}
    />
  );
}
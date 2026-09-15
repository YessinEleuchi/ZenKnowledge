"use client";

import { useCallback, useState } from "react";

import { DocumentModal } from "./documet-modal";
import { DocumentForm } from "./document-form";

import type {
  DocumentItem,
  ServiceOption,
} from "../document.types";

type DocumentEditorModalProps = {
  services: ServiceOption[];
  document?: DocumentItem;
  onClose: () => void;
  onSaved: (message: string) => void;
};

export function DocumentEditorModal({
  services,
  document,
  onClose,
  onSaved,
}: DocumentEditorModalProps) {
  const [pending, setPending] = useState(false);

  const close = useCallback(() => {
    if (!pending) {
      onClose();
    }
  }, [pending, onClose]);

  return (
    <DocumentModal
      title={document ? "Modifier le document" : "Ajouter un document"}
      onClose={close}
      busy={pending}
    >
      <DocumentForm
        document={document}
        services={services}
        onCancel={close}
        onSuccess={onSaved}
        onPendingChange={setPending}
      />
    </DocumentModal>
  );
}
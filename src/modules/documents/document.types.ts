import type { ReactNode } from "react";
import type { StatutVersion } from "@/types/enums";
export type ServiceListProps = {
  services: {
    id: string;
    nom: string;
  }[];
};

export const initialState = {
  success: false,
  message: "",
};
type DocumentItem = {
  id: string;
  titre: string;
  service: string;
  collaboratorsAllowed: boolean;
  revision: string;
  version: number | null;
statut: StatutVersion | null;
};
export type DocumentsLibraryProps = {
  documents: DocumentItem[];
  uploadForm: ReactNode;
};

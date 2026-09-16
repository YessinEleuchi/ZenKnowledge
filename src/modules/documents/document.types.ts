import type { StatutVersion } from "@/types/enums";

export type DocumentActionState = {
  success: boolean;
  message: string;
};

export const initialState: DocumentActionState = {
  success: false,
  message: "",
};

export type ServiceOption = {
  id: string;
  nom: string;
};

export type ServiceListProps = {
  services: ServiceOption[];
};

export type DocumentVersionItem = {
  id: string;
  numero: number;
  statut: StatutVersion;
  nomFichier: string;
  creeLe: string;
};

export type DocumentItem = {
  id: string;
  titre: string;
  serviceId: string | null;
  service: string;
  collaboratorsAllowed: boolean;
  revision: string;
  version: number | null;
  statut: StatutVersion | null;
  versions: DocumentVersionItem[];
};

export type DocumentsLibraryProps = {
  documents: DocumentItem[];
  services: ServiceOption[];
  canManageDocuments: boolean;
};
export type ObservabilitySource = {
  rang: number;
  score: number;

  documentId: string;
  titre: string;
  numeroVersion: number;

  reperePassage: string;
  pageDebut: number | null;
  pageFin: number | null;
};

export type ObservabilityFeedback = {
  evaluation:
    | "UTILE"
    | "INEXACT";

  commentaire:
    | string
    | null;
};

export type ObservabilityExecution = {
  id: string;

  creeLe: string;

  statut: string;
  modele: string;

  latenceMs: number | null;

  tokensEntree: number | null;
  tokensSortie: number | null;
  totalTokens: number;

  sourcesInsuffisantes: boolean;

  utilisateur: {
    nom: string;
    email: string;
  };

  societe: {
    nom: string;
  };

  feedback:
    | ObservabilityFeedback
    | null;

  sources: ObservabilitySource[];
};

export type ObservabilitySummary = {
  totalExecutions: number;

  succes: number;
  echecs: number;

  tauxSucces: number;

  latenceMoyenneMs: number;
  latenceP95Ms: number;

  totalTokens: number;

  sourcesInsuffisantes: number;
  tauxSourcesInsuffisantes: number;

  feedbacks: number;
  utiles: number;
  inexacts: number;
};

export type ObservabilityData = {
  summary: ObservabilitySummary;

  executions:
    ObservabilityExecution[];
};
export type SearchResult = {
  chunkId: string;
  documentId: string;
  versionId: string;
  titre: string;
  numeroVersion: number;
  position: number;
  contenu: string;
  reperePassage: string;
  pageDebut: number | null;
  pageFin: number | null;
  score: number;
};

export type ChatSearchState = {
  success: boolean;
  message: string;
  passages: SearchResult[];
};

export type ChatCitation = {
  numero: number;
  chunkId: string;
  documentId: string;
  versionId: string;
  titre: string;
  numeroVersion: number;
  reperePassage: string;
  pageDebut: number | null;
  pageFin: number | null;
  extrait: string;
};

export type ChatFeedbackEvaluation =
  | "UTILE"
  | "INEXACT";

export type ChatAnswerResult =
  | {
      success: true;

      questionMessageId: string;
      assistantMessageId: string;

      reponse: string;
      sourcesInsuffisantes: boolean;
      citations: ChatCitation[];
    }
  | {
      success: false;
      message: string;
    };

export type StoredConversation = {
  id: string;
  titre: string;
  creeLe: string;
  dernierMessageLe: string;
  messages: StoredChatMessage[];
};

export type StoredChatMessage = {
  id: string;
  role: "USER" | "ASSISTANT";
  contenu: string;
  creeLe: string;

  citations: ChatCitation[];

  evaluation:
    | ChatFeedbackEvaluation
    | null;

  sourcesInsuffisantes: boolean;
};
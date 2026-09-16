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

export type ChatAnswerResult =
  | {
      success: true;
      reponse: string;
      sourcesInsuffisantes: boolean;
      citations: ChatCitation[];
    }
  | {
      success: false;
      message: string;
    };
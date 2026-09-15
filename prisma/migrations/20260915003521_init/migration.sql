CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'GESTIONNAIRE', 'COLLABORATEUR');

-- CreateEnum
CREATE TYPE "StatutVersion" AS ENUM ('EN_ATTENTE', 'EN_TRAITEMENT', 'A_VALIDER', 'PUBLIEE', 'ARCHIVEE', 'ECHEC');

-- CreateEnum
CREATE TYPE "StatutExecution" AS ENUM ('EN_ATTENTE', 'EN_COURS', 'SUCCES', 'ECHEC');

-- CreateEnum
CREATE TYPE "RoleMessage" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "Evaluation" AS ENUM ('UTILE', 'INEXACT');

-- CreateEnum
CREATE TYPE "StatutRevision" AS ENUM ('OUVERTE', 'EN_COURS', 'TERMINEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "StatutRelance" AS ENUM ('PLANIFIEE', 'ENVOYEE', 'ECHEC');

-- CreateTable
CREATE TABLE "Societe" (
    "id" UUID NOT NULL,
    "nom" TEXT NOT NULL,

    CONSTRAINT "Societe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" UUID NOT NULL,
    "societeId" UUID NOT NULL,
    "nom" TEXT NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" UUID NOT NULL,
    "societeId" UUID,
    "serviceId" UUID,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'COLLABORATEUR',
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" UUID NOT NULL,
    "societeId" UUID NOT NULL,
    "serviceId" UUID,
    "proprietaireId" UUID NOT NULL,
    "titre" TEXT NOT NULL,
    "rolesAutorises" "Role"[] DEFAULT ARRAY[]::"Role"[],
    "dateRevision" DATE NOT NULL,
    "supprimeLe" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersionDocument" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "cleStockage" TEXT NOT NULL,
    "nomFichier" TEXT NOT NULL,
    "typeMime" TEXT NOT NULL,
    "statut" "StatutVersion" NOT NULL DEFAULT 'EN_ATTENTE',
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publieLe" TIMESTAMP(3),

    CONSTRAINT "VersionDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionIngestion" (
    "id" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "statut" "StatutExecution" NOT NULL DEFAULT 'EN_ATTENTE',
    "etape" TEXT NOT NULL,
    "tentative" INTEGER NOT NULL DEFAULT 1,
    "erreur" TEXT,
    "debut" TIMESTAMP(3),
    "fin" TIMESTAMP(3),

    CONSTRAINT "ExecutionIngestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chunk" (
    "id" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "contenu" TEXT NOT NULL,
    "pageDebut" INTEGER,
    "pageFin" INTEGER,
    "reperePassage" TEXT NOT NULL,
    "embedding" vector,
    "modeleEmbedding" TEXT NOT NULL,

    CONSTRAINT "Chunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" UUID NOT NULL,
    "utilisateurId" UUID NOT NULL,
    "societeId" UUID NOT NULL,
    "titre" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "role" "RoleMessage" NOT NULL,
    "contenu" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionRAG" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "reponseId" UUID,
    "modele" TEXT NOT NULL,
    "statut" "StatutExecution" NOT NULL DEFAULT 'EN_ATTENTE',
    "latenceMs" INTEGER,
    "tokensEntree" INTEGER,
    "tokensSortie" INTEGER,
    "coutEstime" DECIMAL(18,8),
    "sourcesInsuffisantes" BOOLEAN NOT NULL DEFAULT false,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionRAG_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassageRecupere" (
    "id" UUID NOT NULL,
    "executionId" UUID NOT NULL,
    "chunkId" UUID NOT NULL,
    "rang" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PassageRecupere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Citation" (
    "id" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "passageRecupereId" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "extrait" TEXT NOT NULL,

    CONSTRAINT "Citation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" UUID NOT NULL,
    "utilisateurId" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "evaluation" "Evaluation" NOT NULL,
    "commentaire" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TacheRevision" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "responsableId" UUID NOT NULL,
    "statut" "StatutRevision" NOT NULL DEFAULT 'OUVERTE',
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "echeance" TIMESTAMP(3) NOT NULL,
    "termineeLe" TIMESTAMP(3),
    "depublieLe" TIMESTAMP(3),

    CONSTRAINT "TacheRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Relance" (
    "id" UUID NOT NULL,
    "tacheId" UUID NOT NULL,
    "canal" TEXT NOT NULL,
    "statut" "StatutRelance" NOT NULL DEFAULT 'PLANIFIEE',
    "prevueLe" TIMESTAMP(3) NOT NULL,
    "envoyeeLe" TIMESTAMP(3),
    "erreur" TEXT,

    CONSTRAINT "Relance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Service_societeId_nom_key" ON "Service"("societeId", "nom");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE INDEX "Utilisateur_societeId_idx" ON "Utilisateur"("societeId");

-- CreateIndex
CREATE INDEX "Utilisateur_serviceId_idx" ON "Utilisateur"("serviceId");

-- CreateIndex
CREATE INDEX "Document_societeId_supprimeLe_idx" ON "Document"("societeId", "supprimeLe");

-- CreateIndex
CREATE INDEX "Document_serviceId_idx" ON "Document"("serviceId");

-- CreateIndex
CREATE INDEX "Document_proprietaireId_idx" ON "Document"("proprietaireId");

-- CreateIndex
CREATE INDEX "Document_dateRevision_idx" ON "Document"("dateRevision");

-- CreateIndex
CREATE INDEX "VersionDocument_statut_idx" ON "VersionDocument"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "VersionDocument_documentId_numero_key" ON "VersionDocument"("documentId", "numero");

-- CreateIndex
CREATE INDEX "ExecutionIngestion_versionId_idx" ON "ExecutionIngestion"("versionId");

-- CreateIndex
CREATE INDEX "ExecutionIngestion_statut_idx" ON "ExecutionIngestion"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "Chunk_versionId_position_key" ON "Chunk"("versionId", "position");

-- CreateIndex
CREATE INDEX "Conversation_utilisateurId_creeLe_idx" ON "Conversation"("utilisateurId", "creeLe");

-- CreateIndex
CREATE INDEX "Conversation_societeId_idx" ON "Conversation"("societeId");

-- CreateIndex
CREATE INDEX "Message_conversationId_creeLe_idx" ON "Message"("conversationId", "creeLe");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionRAG_reponseId_key" ON "ExecutionRAG"("reponseId");

-- CreateIndex
CREATE INDEX "ExecutionRAG_questionId_idx" ON "ExecutionRAG"("questionId");

-- CreateIndex
CREATE INDEX "ExecutionRAG_statut_creeLe_idx" ON "ExecutionRAG"("statut", "creeLe");

-- CreateIndex
CREATE INDEX "PassageRecupere_chunkId_idx" ON "PassageRecupere"("chunkId");

-- CreateIndex
CREATE UNIQUE INDEX "PassageRecupere_executionId_rang_key" ON "PassageRecupere"("executionId", "rang");

-- CreateIndex
CREATE UNIQUE INDEX "PassageRecupere_executionId_chunkId_key" ON "PassageRecupere"("executionId", "chunkId");

-- CreateIndex
CREATE INDEX "Citation_passageRecupereId_idx" ON "Citation"("passageRecupereId");

-- CreateIndex
CREATE UNIQUE INDEX "Citation_messageId_numero_key" ON "Citation"("messageId", "numero");

-- CreateIndex
CREATE INDEX "Feedback_messageId_idx" ON "Feedback"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_utilisateurId_messageId_key" ON "Feedback"("utilisateurId", "messageId");

-- CreateIndex
CREATE INDEX "TacheRevision_documentId_idx" ON "TacheRevision"("documentId");

-- CreateIndex
CREATE INDEX "TacheRevision_responsableId_idx" ON "TacheRevision"("responsableId");

-- CreateIndex
CREATE INDEX "TacheRevision_statut_echeance_idx" ON "TacheRevision"("statut", "echeance");

-- CreateIndex
CREATE INDEX "Relance_tacheId_idx" ON "Relance"("tacheId");

-- CreateIndex
CREATE INDEX "Relance_statut_prevueLe_idx" ON "Relance"("statut", "prevueLe");

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "Societe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "Societe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "Societe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_proprietaireId_fkey" FOREIGN KEY ("proprietaireId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionDocument" ADD CONSTRAINT "VersionDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionIngestion" ADD CONSTRAINT "ExecutionIngestion_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "VersionDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chunk" ADD CONSTRAINT "Chunk_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "VersionDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "Societe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionRAG" ADD CONSTRAINT "ExecutionRAG_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionRAG" ADD CONSTRAINT "ExecutionRAG_reponseId_fkey" FOREIGN KEY ("reponseId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassageRecupere" ADD CONSTRAINT "PassageRecupere_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "ExecutionRAG"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassageRecupere" ADD CONSTRAINT "PassageRecupere_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "Chunk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_passageRecupereId_fkey" FOREIGN KEY ("passageRecupereId") REFERENCES "PassageRecupere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TacheRevision" ADD CONSTRAINT "TacheRevision_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TacheRevision" ADD CONSTRAINT "TacheRevision_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relance" ADD CONSTRAINT "Relance_tacheId_fkey" FOREIGN KEY ("tacheId") REFERENCES "TacheRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

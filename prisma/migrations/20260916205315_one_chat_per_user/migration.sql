/*
  Warnings:

  - A unique constraint covering the columns `[utilisateurId]` on the table `Conversation` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Conversation_utilisateurId_dernierMessageLe_idx";

-- AlterTable
ALTER TABLE "Conversation" ALTER COLUMN "titre" SET DEFAULT 'Assistant documentaire';

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_utilisateurId_key" ON "Conversation"("utilisateurId");

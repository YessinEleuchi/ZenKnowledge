/*
  Warnings:

  - Added the required column `modifieLe` to the `Conversation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `modifieLe` to the `Feedback` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Conversation_utilisateurId_creeLe_idx";

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "dernierMessageLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "modifieLe" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN     "modifieLe" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Conversation_utilisateurId_dernierMessageLe_idx" ON "Conversation"("utilisateurId", "dernierMessageLe");

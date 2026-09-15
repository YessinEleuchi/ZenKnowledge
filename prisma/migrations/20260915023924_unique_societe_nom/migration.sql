/*
  Warnings:

  - A unique constraint covering the columns `[nom]` on the table `Societe` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Societe_nom_key" ON "Societe"("nom");

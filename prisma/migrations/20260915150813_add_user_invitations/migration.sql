-- CreateTable
CREATE TABLE "InvitationUtilisateur" (
    "id" UUID NOT NULL,
    "utilisateurId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expireLe" TIMESTAMP(3) NOT NULL,
    "utiliseLe" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvitationUtilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvitationUtilisateur_tokenHash_key" ON "InvitationUtilisateur"("tokenHash");

-- CreateIndex
CREATE INDEX "InvitationUtilisateur_utilisateurId_idx" ON "InvitationUtilisateur"("utilisateurId");

-- CreateIndex
CREATE INDEX "InvitationUtilisateur_expireLe_idx" ON "InvitationUtilisateur"("expireLe");

-- AddForeignKey
ALTER TABLE "InvitationUtilisateur" ADD CONSTRAINT "InvitationUtilisateur_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

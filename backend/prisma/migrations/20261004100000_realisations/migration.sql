-- CreateTable
CREATE TABLE "Realisation" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "photoChemin" TEXT NOT NULL,
    "photoMime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Realisation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Realisation_utilisateurId_idx" ON "Realisation"("utilisateurId");

-- AddForeignKey
ALTER TABLE "Realisation" ADD CONSTRAINT "Realisation_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

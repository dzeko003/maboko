-- AlterTable
ALTER TABLE "CompteClient" ADD COLUMN     "emailVerifieLe" TIMESTAMP(3),
ADD COLUMN     "jetonActivationExpire" TIMESTAMP(3),
ADD COLUMN     "jetonActivationHash" TEXT;

-- AlterTable
ALTER TABLE "Utilisateur" ADD COLUMN     "emailVerifieLe" TIMESTAMP(3),
ADD COLUMN     "jetonActivationExpire" TIMESTAMP(3),
ADD COLUMN     "jetonActivationHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CompteClient_jetonActivationHash_key" ON "CompteClient"("jetonActivationHash");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_jetonActivationHash_key" ON "Utilisateur"("jetonActivationHash");


-- Les comptes créés avant l'activation par e-mail sont considérés comme vérifiés
UPDATE "Utilisateur" SET "emailVerifieLe" = "createdAt";
UPDATE "CompteClient" SET "emailVerifieLe" = "createdAt";

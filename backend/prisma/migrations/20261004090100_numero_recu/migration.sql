-- AlterTable
ALTER TABLE "Paiement" ADD COLUMN "numeroRecu" TEXT;

-- Les paiements déjà enregistrés reçoivent un numéro, dans l'ordre d'enregistrement, par activité et par année
WITH numerotes AS (
  SELECT
    "id",
    EXTRACT(YEAR FROM "createdAt")::int AS annee,
    ROW_NUMBER() OVER (PARTITION BY "activiteId", EXTRACT(YEAR FROM "createdAt") ORDER BY "createdAt", "id") AS rang
  FROM "Paiement"
)
UPDATE "Paiement" AS p
SET "numeroRecu" = 'REC-' || n.annee || '-' || LPAD(n.rang::text, 4, '0')
FROM numerotes AS n
WHERE p."id" = n."id";

-- Le compteur repart après le dernier numéro attribué
INSERT INTO "Compteur" ("activiteId", "type", "annee", "valeur")
SELECT "activiteId", 'RECU', EXTRACT(YEAR FROM "createdAt")::int, COUNT(*)
FROM "Paiement"
GROUP BY "activiteId", EXTRACT(YEAR FROM "createdAt")
ON CONFLICT ("activiteId", "type", "annee") DO UPDATE SET "valeur" = GREATEST("Compteur"."valeur", EXCLUDED."valeur");

ALTER TABLE "Paiement" ALTER COLUMN "numeroRecu" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Paiement_activiteId_numeroRecu_key" ON "Paiement"("activiteId", "numeroRecu");

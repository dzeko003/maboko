-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('RESPONSABLE', 'TECHNICIEN');

-- CreateEnum
CREATE TYPE "StatutIntervention" AS ENUM ('A_PLANIFIER', 'PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "Priorite" AS ENUM ('BASSE', 'NORMALE', 'HAUTE', 'URGENTE');

-- CreateEnum
CREATE TYPE "EtatDevis" AS ENUM ('BROUILLON', 'ENVOYE', 'ACCEPTE', 'REFUSE');

-- CreateEnum
CREATE TYPE "TypeLigne" AS ENUM ('MAIN_OEUVRE', 'MATERIEL');

-- CreateEnum
CREATE TYPE "CategoriePiece" AS ENUM ('AVANT', 'APRES', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "ModePaiement" AS ENUM ('ESPECES', 'MOBILE_MONEY', 'VIREMENT', 'CHEQUE', 'CARTE', 'AUTRE');

-- CreateEnum
CREATE TYPE "TypeReference" AS ENUM ('INTERVENTION', 'DEVIS', 'FACTURE');

-- CreateTable
CREATE TABLE "Activite" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT,
    "adresse" TEXT,
    "devise" TEXT NOT NULL,
    "infosFacturation" TEXT,
    "logoChemin" TEXT,
    "logoMime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" TEXT NOT NULL,
    "activiteId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasseHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'RESPONSABLE',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profilPublic" BOOLEAN NOT NULL DEFAULT false,
    "slug" TEXT,
    "metier" TEXT,
    "bio" TEXT,
    "telephone" TEXT,
    "whatsapp" TEXT,
    "ville" TEXT,
    "quartier" TEXT,
    "photoChemin" TEXT,
    "photoMime" TEXT,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Compteur" (
    "activiteId" TEXT NOT NULL,
    "type" "TypeReference" NOT NULL,
    "annee" INTEGER NOT NULL,
    "valeur" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Compteur_pkey" PRIMARY KEY ("activiteId","type","annee")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "activiteId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT,
    "adresse" TEXT,
    "notes" TEXT,
    "archive" BOOLEAN NOT NULL DEFAULT false,
    "compteClientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Intervention" (
    "id" TEXT NOT NULL,
    "activiteId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "technicienId" TEXT,
    "objet" TEXT NOT NULL,
    "description" TEXT,
    "adresse" TEXT,
    "priorite" "Priorite" NOT NULL DEFAULT 'NORMALE',
    "statut" "StatutIntervention" NOT NULL DEFAULT 'A_PLANIFIER',
    "datePrevue" TIMESTAMP(3),
    "dureeMinutes" INTEGER,
    "avisToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Intervention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoriqueStatut" (
    "id" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "ancienStatut" "StatutIntervention",
    "nouveauStatut" "StatutIntervention" NOT NULL,
    "utilisateurId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoriqueStatut_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rapport" (
    "id" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "constats" TEXT,
    "causePresumee" TEXT,
    "travauxRecommandes" TEXT,
    "avancement" TEXT,
    "travauxRealises" TEXT,
    "materiauxUtilises" TEXT,
    "observations" TEXT,
    "valideParNom" TEXT,
    "valideLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rapport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PieceJointe" (
    "id" TEXT NOT NULL,
    "activiteId" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "categorie" "CategoriePiece" NOT NULL,
    "chemin" TEXT NOT NULL,
    "nomOriginal" TEXT NOT NULL,
    "typeMime" TEXT NOT NULL,
    "taille" INTEGER NOT NULL,
    "publiee" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PieceJointe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Devis" (
    "id" TEXT NOT NULL,
    "activiteId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "etat" "EtatDevis" NOT NULL DEFAULT 'BROUILLON',
    "version" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "envoyeLe" TIMESTAMP(3),
    "reponduLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Devis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneDevis" (
    "id" TEXT NOT NULL,
    "devisId" TEXT NOT NULL,
    "type" "TypeLigne" NOT NULL,
    "designation" TEXT NOT NULL,
    "quantite" DECIMAL(10,2) NOT NULL,
    "prixUnitaire" DECIMAL(12,2) NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LigneDevis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facture" (
    "id" TEXT NOT NULL,
    "activiteId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "devisId" TEXT,
    "dateEmission" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateEcheance" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Facture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneFacture" (
    "id" TEXT NOT NULL,
    "factureId" TEXT NOT NULL,
    "type" "TypeLigne" NOT NULL,
    "designation" TEXT NOT NULL,
    "quantite" DECIMAL(10,2) NOT NULL,
    "prixUnitaire" DECIMAL(12,2) NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LigneFacture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paiement" (
    "id" TEXT NOT NULL,
    "activiteId" TEXT NOT NULL,
    "factureId" TEXT NOT NULL,
    "montant" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "mode" "ModePaiement" NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompteClient" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "ville" TEXT,
    "motDePasseHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompteClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Avis" (
    "id" TEXT NOT NULL,
    "technicienId" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "compteClientId" TEXT NOT NULL,
    "note" INTEGER NOT NULL,
    "commentaire" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Avis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_slug_key" ON "Utilisateur"("slug");

-- CreateIndex
CREATE INDEX "Utilisateur_profilPublic_ville_idx" ON "Utilisateur"("profilPublic", "ville");

-- CreateIndex
CREATE INDEX "Utilisateur_activiteId_idx" ON "Utilisateur"("activiteId");

-- CreateIndex
CREATE INDEX "Client_activiteId_archive_idx" ON "Client"("activiteId", "archive");

-- CreateIndex
CREATE UNIQUE INDEX "Intervention_avisToken_key" ON "Intervention"("avisToken");

-- CreateIndex
CREATE INDEX "Intervention_activiteId_statut_idx" ON "Intervention"("activiteId", "statut");

-- CreateIndex
CREATE INDEX "Intervention_activiteId_datePrevue_idx" ON "Intervention"("activiteId", "datePrevue");

-- CreateIndex
CREATE INDEX "Intervention_clientId_idx" ON "Intervention"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Intervention_activiteId_reference_key" ON "Intervention"("activiteId", "reference");

-- CreateIndex
CREATE INDEX "HistoriqueStatut_interventionId_idx" ON "HistoriqueStatut"("interventionId");

-- CreateIndex
CREATE UNIQUE INDEX "Rapport_interventionId_key" ON "Rapport"("interventionId");

-- CreateIndex
CREATE INDEX "PieceJointe_interventionId_idx" ON "PieceJointe"("interventionId");

-- CreateIndex
CREATE INDEX "Devis_interventionId_idx" ON "Devis"("interventionId");

-- CreateIndex
CREATE UNIQUE INDEX "Devis_activiteId_reference_key" ON "Devis"("activiteId", "reference");

-- CreateIndex
CREATE INDEX "LigneDevis_devisId_idx" ON "LigneDevis"("devisId");

-- CreateIndex
CREATE INDEX "Facture_interventionId_idx" ON "Facture"("interventionId");

-- CreateIndex
CREATE UNIQUE INDEX "Facture_activiteId_reference_key" ON "Facture"("activiteId", "reference");

-- CreateIndex
CREATE INDEX "LigneFacture_factureId_idx" ON "LigneFacture"("factureId");

-- CreateIndex
CREATE INDEX "Paiement_factureId_idx" ON "Paiement"("factureId");

-- CreateIndex
CREATE UNIQUE INDEX "CompteClient_email_key" ON "CompteClient"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Avis_interventionId_key" ON "Avis"("interventionId");

-- CreateIndex
CREATE INDEX "Avis_technicienId_idx" ON "Avis"("technicienId");

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_activiteId_fkey" FOREIGN KEY ("activiteId") REFERENCES "Activite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compteur" ADD CONSTRAINT "Compteur_activiteId_fkey" FOREIGN KEY ("activiteId") REFERENCES "Activite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_activiteId_fkey" FOREIGN KEY ("activiteId") REFERENCES "Activite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_compteClientId_fkey" FOREIGN KEY ("compteClientId") REFERENCES "CompteClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_activiteId_fkey" FOREIGN KEY ("activiteId") REFERENCES "Activite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_technicienId_fkey" FOREIGN KEY ("technicienId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriqueStatut" ADD CONSTRAINT "HistoriqueStatut_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriqueStatut" ADD CONSTRAINT "HistoriqueStatut_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rapport" ADD CONSTRAINT "Rapport_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PieceJointe" ADD CONSTRAINT "PieceJointe_activiteId_fkey" FOREIGN KEY ("activiteId") REFERENCES "Activite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PieceJointe" ADD CONSTRAINT "PieceJointe_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Devis" ADD CONSTRAINT "Devis_activiteId_fkey" FOREIGN KEY ("activiteId") REFERENCES "Activite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Devis" ADD CONSTRAINT "Devis_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneDevis" ADD CONSTRAINT "LigneDevis_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_activiteId_fkey" FOREIGN KEY ("activiteId") REFERENCES "Activite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneFacture" ADD CONSTRAINT "LigneFacture_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_activiteId_fkey" FOREIGN KEY ("activiteId") REFERENCES "Activite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avis" ADD CONSTRAINT "Avis_technicienId_fkey" FOREIGN KEY ("technicienId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avis" ADD CONSTRAINT "Avis_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avis" ADD CONSTRAINT "Avis_compteClientId_fkey" FOREIGN KEY ("compteClientId") REFERENCES "CompteClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;


import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { requireRole } from "../../middleware/auth.js";
import { HttpError, notFound } from "../../utils/httpError.js";
import {
  avecLogo,
  blocClient,
  blocPaiements,
  entete,
  formatDate,
  formatDateHeure,
  ouvrirPdf,
  photos,
  pied,
  section,
  tableauLignes,
  titreSection,
} from "../../utils/pdf.js";
import { BUCKETS, lireFichier } from "../../utils/stockage.js";
import { perimetre, trouverIntervention } from "./acces.js";
import { prochaineReference } from "./references.js";

// Monté sur /interventions/:id : devis, factures et PDF
export const documentsRouter = Router({ mergeParams: true });

const lignesSchema = z
  .array(
    z.object({
      type: z.enum(["MAIN_OEUVRE", "MATERIEL"]),
      designation: z.string().trim().min(1, "Désignation requise"),
      quantite: z.coerce.number().positive("Quantité invalide"),
      prixUnitaire: z.coerce.number().min(0, "Prix invalide"),
    }),
  )
  .min(1, "Ajoutez au moins une ligne");

const devisSchema = z.object({
  lignes: lignesSchema,
  notes: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().optional()),
});

// Un devis brouillon est envoyé au client, qui l'accepte ou le refuse
const TRANSITIONS_DEVIS = { ENVOYE: ["BROUILLON"], ACCEPTE: ["ENVOYE"], REFUSE: ["ENVOYE"] };
const etatDevisSchema = z.object({ etat: z.enum(Object.keys(TRANSITIONS_DEVIS)) });

// Facture : soit depuis un devis accepté, soit avec ses propres lignes après validation des travaux
const factureSchema = z.union([z.object({ devisId: z.string().min(1) }), z.object({ lignes: lignesSchema })]);

const lignesOrdonnees = (lignes) => lignes.map((l, ordre) => ({ ...l, ordre }));

async function trouverDevis(tx, interventionId, devisId) {
  const devis = await tx.devis.findFirst({ where: { id: devisId, interventionId } });
  if (!devis) throw notFound("Devis");
  return devis;
}

documentsRouter.post("/devis", async (req, res) => {
  const { lignes, notes } = devisSchema.parse(req.body);
  const devis = await prisma.$transaction(async (tx) => {
    const intervention = await trouverIntervention(tx, req.user, req.params.id);
    return tx.devis.create({
      data: {
        activiteId: intervention.activiteId,
        interventionId: intervention.id,
        reference: await prochaineReference(tx, intervention.activiteId, "DEVIS"),
        notes,
        lignes: { create: lignesOrdonnees(lignes) },
      },
      select: { id: true, reference: true },
    });
  });
  res.status(201).json(devis);
});

documentsRouter.patch("/devis/:devisId/etat", async (req, res) => {
  const { etat } = etatDevisSchema.parse(req.body);
  const intervention = await trouverIntervention(prisma, req.user, req.params.id);
  const devis = await trouverDevis(prisma, intervention.id, req.params.devisId);
  if (!TRANSITIONS_DEVIS[etat].includes(devis.etat)) {
    throw new HttpError(409, "Ce changement n'est pas possible pour ce devis");
  }
  await prisma.devis.update({
    where: { id: devis.id },
    data: { etat, ...(etat === "ENVOYE" ? { envoyeLe: new Date() } : { reponduLe: new Date() }) },
  });
  res.status(204).end();
});

// Seul un brouillon peut être supprimé : un devis envoyé a été vu par le client
documentsRouter.delete("/devis/:devisId", async (req, res) => {
  const intervention = await trouverIntervention(prisma, req.user, req.params.id);
  const devis = await trouverDevis(prisma, intervention.id, req.params.devisId);
  if (devis.etat !== "BROUILLON") throw new HttpError(409, "Seul un devis brouillon peut être supprimé");
  await prisma.devis.delete({ where: { id: devis.id } });
  res.status(204).end();
});

documentsRouter.post("/factures", requireRole("RESPONSABLE"), async (req, res) => {
  const data = factureSchema.parse(req.body);
  const facture = await prisma.$transaction(async (tx) => {
    const intervention = await trouverIntervention(tx, req.user, req.params.id);
    let lignes;
    let devisId = null;

    if ("devisId" in data) {
      const devis = await tx.devis.findFirst({
        where: { id: data.devisId, interventionId: intervention.id },
        include: { lignes: { orderBy: { ordre: "asc" } }, factures: { select: { id: true } } },
      });
      if (!devis) throw notFound("Devis");
      if (devis.etat !== "ACCEPTE") throw new HttpError(409, "Seul un devis accepté peut être facturé");
      if (devis.factures.length) throw new HttpError(409, "Ce devis a déjà été facturé");
      devisId = devis.id;
      lignes = devis.lignes.map(({ type, designation, quantite, prixUnitaire }) => ({
        type,
        designation,
        quantite,
        prixUnitaire,
      }));
    } else {
      const rapport = await tx.rapport.findUnique({ where: { interventionId: intervention.id } });
      if (!rapport?.valideLe) throw new HttpError(409, "Validez les travaux avant de facturer sans devis");
      lignes = data.lignes;
    }

    return tx.facture.create({
      data: {
        activiteId: intervention.activiteId,
        interventionId: intervention.id,
        devisId,
        reference: await prochaineReference(tx, intervention.activiteId, "FACTURE"),
        lignes: { create: lignesOrdonnees(lignes) },
      },
      select: { id: true, reference: true },
    });
  });
  res.status(201).json(facture);
});

/* ---------- PDF ---------- */

async function chargerPourPdf(req) {
  const intervention = await prisma.intervention.findFirst({
    where: { id: req.params.id, ...perimetre(req.user) },
    include: { client: true, activite: true, technicien: { select: { nom: true } } },
  });
  if (!intervention) throw notFound("Intervention");
  return { ...intervention, activite: await avecLogo(intervention.activite) };
}

documentsRouter.get("/devis/:devisId/pdf", async (req, res) => {
  const intervention = await chargerPourPdf(req);
  const devis = await prisma.devis.findFirst({
    where: { id: req.params.devisId, interventionId: intervention.id },
    include: { lignes: { orderBy: { ordre: "asc" } } },
  });
  if (!devis) throw notFound("Devis");

  const doc = ouvrirPdf(res, devis.reference);
  entete(doc, intervention.activite, {
    titre: "DEVIS",
    reference: devis.reference,
    dateDocument: `Établi le ${formatDate(devis.createdAt)}`,
  });
  blocClient(doc, intervention);
  tableauLignes(doc, devis.lignes, intervention.activite.devise);
  section(doc, "Notes", devis.notes);
  pied(doc, "Bon pour accord — date et signature du client :");
  doc.end();
});

documentsRouter.get("/factures/:factureId/pdf", async (req, res) => {
  const intervention = await chargerPourPdf(req);
  const facture = await prisma.facture.findFirst({
    where: { id: req.params.factureId, interventionId: intervention.id },
    include: {
      lignes: { orderBy: { ordre: "asc" } },
      devis: { select: { reference: true } },
      paiements: { orderBy: { date: "asc" } },
    },
  });
  if (!facture) throw notFound("Facture");

  const doc = ouvrirPdf(res, facture.reference);
  entete(doc, intervention.activite, {
    titre: "FACTURE",
    reference: facture.reference,
    dateDocument: `Émise le ${formatDate(facture.dateEmission)}`,
  });
  blocClient(doc, intervention);
  const total = tableauLignes(doc, facture.lignes, intervention.activite.devise);
  // Les acomptes et paiements déjà reçus apparaissent sur la facture
  blocPaiements(doc, facture.paiements, total, intervention.activite.devise);
  if (facture.devis) section(doc, "Référence du devis", facture.devis.reference);
  if (facture.dateEcheance) section(doc, "Échéance", formatDate(facture.dateEcheance));
  doc.end();
});

documentsRouter.get("/rapport/pdf", async (req, res) => {
  const intervention = await chargerPourPdf(req);
  const [rapport, pieces] = await Promise.all([
    prisma.rapport.findUnique({ where: { interventionId: intervention.id } }),
    prisma.pieceJointe.findMany({
      where: { interventionId: intervention.id, categorie: { in: ["AVANT", "APRES"] }, typeMime: { in: ["image/jpeg", "image/png"] } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  // Une photo illisible ne doit pas empêcher de produire le rapport
  const images = await Promise.all(
    pieces.map(async (p) => ({ categorie: p.categorie, contenu: await lireFichier(BUCKETS.prive, p.chemin).catch(() => null) })),
  );
  const photosDe = (categorie) => images.filter((i) => i.categorie === categorie && i.contenu).map((i) => i.contenu);

  const doc = ouvrirPdf(res, `Rapport-${intervention.reference}`);
  entete(doc, intervention.activite, {
    titre: "RAPPORT D'INTERVENTION",
    reference: intervention.reference,
    dateDocument: `Édité le ${formatDate(new Date())}`,
  });
  blocClient(doc, intervention);
  if (intervention.technicien) section(doc, "Technicien", intervention.technicien.nom);
  section(doc, "Description du besoin", intervention.description);

  titreSection(doc, "Diagnostic");
  section(doc, "Constats", rapport?.constats);
  section(doc, "Cause présumée", rapport?.causePresumee);
  section(doc, "Travaux recommandés", rapport?.travauxRecommandes);
  photos(doc, photosDe("AVANT"));

  titreSection(doc, "Travaux");
  section(doc, "Avancement", rapport?.avancement);
  section(doc, "Travaux réalisés", rapport?.travauxRealises);
  section(doc, "Matériaux utilisés", rapport?.materiauxUtilises);
  section(doc, "Observations finales", rapport?.observations);
  photos(doc, photosDe("APRES"));

  pied(
    doc,
    rapport?.valideLe
      ? `Travaux validés par ${rapport.valideParNom} le ${formatDateHeure(rapport.valideLe)}.`
      : "Travaux non encore validés par le client.",
  );
  doc.end();
});

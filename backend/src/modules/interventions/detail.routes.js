import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { uploadDocument, uploadImage } from "../../middleware/upload.js";
import { HttpError, notFound } from "../../utils/httpError.js";
import {
  BUCKETS,
  dossiers,
  envoyerFichier,
  lienTemporaire,
  lireFichierLocal,
  stockageLocal,
  supprimerFichier,
} from "../../utils/stockage.js";
import { perimetre, trouverIntervention } from "./acces.js";
import { documentsRouter } from "./documents.routes.js";

// Monté sur /interventions/:id
export const detailRouter = Router({ mergeParams: true });

const texteLibre = z.preprocess((v) => (v === "" ? null : v), z.string().trim().nullable().optional());

const rapportSchema = z.object({
  constats: texteLibre,
  causePresumee: texteLibre,
  travauxRecommandes: texteLibre,
  avancement: texteLibre,
  travauxRealises: texteLibre,
  materiauxUtilises: texteLibre,
  observations: texteLibre,
});

// Changements de statut proposés par les boutons de la fiche ; « Terminée » passe par la validation
const TRANSITIONS = {
  EN_COURS: ["A_PLANIFIER", "PLANIFIEE"],
  ANNULEE: ["A_PLANIFIER", "PLANIFIEE", "EN_COURS"],
};
const statutSchema = z.object({ statut: z.enum(Object.keys(TRANSITIONS)) });
const validationSchema = z.object({ valideParNom: z.string().trim().min(2, "Nom de la personne qui valide requis") });
const categorieSchema = z.enum(["AVANT", "APRES", "DOCUMENT"]);

const totalLignes = (lignes) => lignes.reduce((total, l) => total + Number(l.quantite) * Number(l.prixUnitaire), 0);

async function changerStatut(tx, intervention, nouveauStatut, utilisateurId) {
  return tx.intervention.update({
    where: { id: intervention.id },
    data: {
      statut: nouveauStatut,
      historiques: { create: { ancienStatut: intervention.statut, nouveauStatut, utilisateurId } },
    },
  });
}

detailRouter.get("/", async (req, res) => {
  const intervention = await prisma.intervention.findFirst({
    where: { id: req.params.id, ...perimetre(req.user) },
    select: {
      id: true,
      reference: true,
      objet: true,
      description: true,
      adresse: true,
      priorite: true,
      statut: true,
      datePrevue: true,
      dureeMinutes: true,
      createdAt: true,
      client: { select: { id: true, nom: true, telephone: true, adresse: true } },
      technicien: { select: { id: true, nom: true, telephone: true, whatsapp: true } },
      rapport: true,
      historiques: {
        select: {
          id: true,
          ancienStatut: true,
          nouveauStatut: true,
          createdAt: true,
          utilisateur: { select: { nom: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      piecesJointes: {
        select: { id: true, categorie: true, nomOriginal: true, typeMime: true, taille: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
      devis: {
        select: { id: true, reference: true, etat: true, version: true, notes: true, createdAt: true, lignes: true },
        orderBy: { createdAt: "desc" },
      },
      factures: {
        select: { id: true, reference: true, devisId: true, dateEmission: true, dateEcheance: true, lignes: true },
        orderBy: { dateEmission: "desc" },
      },
    },
  });
  if (!intervention) throw notFound("Intervention");

  const { piecesJointes, devis, factures, ...reste } = intervention;
  res.json({
    ...reste,
    // Le fichier passe par l'API, qui vérifie l'accès avant de le servir
    piecesJointes: piecesJointes.map((piece) => ({
      ...piece,
      url: `/api/interventions/${intervention.id}/pieces/${piece.id}/fichier`,
    })),
    devis: devis.map(({ lignes, ...d }) => ({ ...d, total: totalLignes(lignes) })),
    factures: factures.map(({ lignes, ...f }) => ({ ...f, total: totalLignes(lignes) })),
  });
});

detailRouter.patch("/statut", async (req, res) => {
  const { statut } = statutSchema.parse(req.body);
  await prisma.$transaction(async (tx) => {
    const intervention = await trouverIntervention(tx, req.user, req.params.id);
    if (!TRANSITIONS[statut].includes(intervention.statut)) {
      throw new HttpError(409, "Ce changement de statut n'est pas possible pour cette intervention");
    }
    await changerStatut(tx, intervention, statut, req.user.id);
  });
  res.status(204).end();
});

detailRouter.put("/rapport", async (req, res) => {
  const data = rapportSchema.parse(req.body);
  const intervention = await trouverIntervention(prisma, req.user, req.params.id);
  const rapport = await prisma.rapport.upsert({
    where: { interventionId: intervention.id },
    create: { interventionId: intervention.id, ...data },
    update: data,
  });
  res.json(rapport);
});

// Le client (ou son représentant) valide les travaux : l'intervention passe à « Terminée »
detailRouter.post("/validation", async (req, res) => {
  const { valideParNom } = validationSchema.parse(req.body);
  await prisma.$transaction(async (tx) => {
    const intervention = await trouverIntervention(tx, req.user, req.params.id);
    if (intervention.statut === "ANNULEE") throw new HttpError(409, "Cette intervention est annulée");
    const rapport = await tx.rapport.findUnique({ where: { interventionId: intervention.id } });
    if (rapport?.valideLe) throw new HttpError(409, "Les travaux ont déjà été validés");

    const validation = { valideParNom, valideLe: new Date() };
    await tx.rapport.upsert({
      where: { interventionId: intervention.id },
      create: { interventionId: intervention.id, ...validation },
      update: validation,
    });
    if (intervention.statut !== "TERMINEE") await changerStatut(tx, intervention, "TERMINEE", req.user.id);
  });
  res.status(204).end();
});

// Photos avant/après (images) et documents (images ou PDF)
detailRouter.post(
  "/pieces",
  (req, res, next) => {
    const categorie = categorieSchema.parse(req.query.categorie);
    return (categorie === "DOCUMENT" ? uploadDocument : uploadImage)(req, res, next);
  },
  async (req, res) => {
    const categorie = categorieSchema.parse(req.query.categorie);
    const intervention = await trouverIntervention(prisma, req.user, req.params.id);
    const fichier = await envoyerFichier({
      bucket: BUCKETS.prive,
      dossier: dossiers.intervention(intervention.activiteId, intervention.id),
      fichier: req.file,
    });
    const piece = await prisma.pieceJointe.create({
      data: { activiteId: intervention.activiteId, interventionId: intervention.id, categorie, ...fichier },
      select: { id: true },
    });
    res.status(201).json(piece);
  },
);

detailRouter.get("/pieces/:pieceId/fichier", async (req, res) => {
  const intervention = await trouverIntervention(prisma, req.user, req.params.id);
  const piece = await prisma.pieceJointe.findFirst({ where: { id: req.params.pieceId, interventionId: intervention.id } });
  if (!piece) throw notFound("Fichier");
  // Avec R2 : redirection vers un lien signé à durée limitée (le bucket reste privé)
  if (!stockageLocal) return res.redirect(await lienTemporaire(piece.chemin));

  const flux = await lireFichierLocal(BUCKETS.prive, piece.chemin);
  res.setHeader("Content-Type", piece.typeMime);
  res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(piece.nomOriginal)}`);
  res.setHeader("Cache-Control", "private, max-age=600");
  flux.on("error", () => res.destroy());
  flux.pipe(res);
});

detailRouter.delete("/pieces/:pieceId", async (req, res) => {
  const intervention = await trouverIntervention(prisma, req.user, req.params.id);
  const piece = await prisma.pieceJointe.findFirst({ where: { id: req.params.pieceId, interventionId: intervention.id } });
  if (!piece) throw notFound("Fichier");
  await supprimerFichier(BUCKETS.prive, piece.chemin);
  await prisma.pieceJointe.delete({ where: { id: piece.id } });
  res.status(204).end();
});

// Devis, factures et PDF
detailRouter.use(documentsRouter);

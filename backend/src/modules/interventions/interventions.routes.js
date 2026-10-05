import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { requireRole } from "../../middleware/auth.js";
import { HttpError } from "../../utils/httpError.js";
import { perimetre, trouverIntervention } from "./acces.js";
import { detailRouter } from "./detail.routes.js";
import { prochaineReference } from "./references.js";

export const interventionsRouter = Router();

const optionnel = z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().optional());

// Le client est l'une des fiches de l'activité (onglet Clients)
const champs = z.object({
  clientId: z.string({ error: "Client requis" }).min(1, "Client requis"),
  objet: z.string().trim().min(3, "Objet trop court"),
  priorite: z.enum(["BASSE", "NORMALE", "HAUTE", "URGENTE"]).default("NORMALE"),
  datePrevue: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.date().optional()),
  dureeMinutes: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().positive("Durée invalide").optional(),
  ),
  technicienId: optionnel,
  adresse: optionnel,
  description: optionnel,
});

const statut = z.enum(["A_PLANIFIER", "PLANIFIEE", "EN_COURS", "TERMINEE", "ANNULEE"]);

// À la création, le statut est déduit de la date s'il n'est pas fourni
const creationSchema = champs.extend({ statut: statut.optional() });
const modificationSchema = champs.extend({ statut });

const listeSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  taille: z.coerce.number().int().min(1).max(100).default(20),
  statut: statut.optional().catch(undefined),
  q: z.string().trim().optional(),
  // Bornes de la journée filtrée, calculées par le navigateur dans son fuseau
  du: z.coerce.date().optional(),
  au: z.coerce.date().optional(),
});

const selectListe = {
  id: true,
  reference: true,
  objet: true,
  adresse: true,
  priorite: true,
  statut: true,
  datePrevue: true,
  client: { select: { id: true, nom: true } },
  technicien: { select: { id: true, nom: true } },
};

// Fiche client de l'activité (ajoutée depuis l'onglet Clients)
async function resoudreClient(tx, activiteId, data, clientActuelId) {
  const client = await tx.client.findFirst({
    // Une fiche archivée reste acceptée si l'intervention y est déjà rattachée
    where: { id: data.clientId, activiteId, ...(data.clientId !== clientActuelId && { archive: false }) },
  });
  if (!client) throw new HttpError(400, "Client introuvable");
  return client;
}

async function verifierTechnicien(tx, activiteId, technicienId) {
  if (!technicienId) return;
  const technicien = await tx.utilisateur.findFirst({ where: { id: technicienId, activiteId, actif: true } });
  if (!technicien) throw new HttpError(400, "Technicien introuvable");
}

// Clients proposés dans le formulaire d'intervention : uniquement ceux ajoutés dans l'onglet Clients
// (externes et enregistrés sur Carnet), hors archives.
// Déclarée avant les routes « /:id » pour que « clients » ne soit pas pris pour un identifiant.
interventionsRouter.get("/clients", async (req, res) => {
  const clients = await prisma.client.findMany({
    where: { activiteId: req.user.activiteId, archive: false },
    select: { id: true, nom: true, telephone: true, adresse: true, compteClientId: true },
    orderBy: { nom: "asc" },
  });
  res.json(clients);
});

interventionsRouter.get("/", async (req, res) => {
  const { page, taille, statut, q, du, au } = listeSchema.parse(req.query);
  const base = perimetre(req.user);
  const where = {
    ...base,
    ...(statut && { statut }),
    ...((du || au) && { datePrevue: { ...(du && { gte: du }), ...(au && { lt: au }) } }),
    ...(q && {
      OR: [
        { objet: { contains: q, mode: "insensitive" } },
        { reference: { contains: q, mode: "insensitive" } },
        { client: { nom: { contains: q, mode: "insensitive" } } },
      ],
    }),
  };

  // Les compteurs des onglets portent sur toutes les interventions, quels que soient les filtres
  const [total, parStatut] = await Promise.all([
    prisma.intervention.count({ where }),
    prisma.intervention.groupBy({ by: ["statut"], where: base, _count: { _all: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / taille));
  // Après une suppression, la page demandée peut ne plus exister
  const pageCourante = Math.min(page, pages);

  const interventions = await prisma.intervention.findMany({
    where,
    select: selectListe,
    orderBy: [{ datePrevue: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }, { id: "asc" }],
    skip: (pageCourante - 1) * taille,
    take: taille,
  });

  res.json({
    interventions,
    total,
    page: pageCourante,
    pages,
    taille,
    compteurs: Object.fromEntries(parStatut.map((g) => [g.statut, g._count._all])),
  });
});

// Seul le responsable crée des interventions ; un technicien travaille sur celles qui lui sont attribuées
interventionsRouter.post("/", requireRole("RESPONSABLE"), async (req, res) => {
  const { id: utilisateurId, activiteId } = req.user;
  const data = creationSchema.parse(req.body);

  const intervention = await prisma.$transaction(async (tx) => {
    const client = await resoudreClient(tx, activiteId, data);
    await verifierTechnicien(tx, activiteId, data.technicienId);

    const statut = data.statut ?? (data.datePrevue ? "PLANIFIEE" : "A_PLANIFIER");
    return tx.intervention.create({
      data: {
        activiteId,
        reference: await prochaineReference(tx, activiteId, "INTERVENTION"),
        clientId: client.id,
        technicienId: data.technicienId ?? null,
        objet: data.objet,
        description: data.description,
        adresse: data.adresse ?? client.adresse,
        priorite: data.priorite,
        statut,
        datePrevue: data.datePrevue,
        dureeMinutes: data.dureeMinutes,
        historiques: { create: { nouveauStatut: statut, utilisateurId } },
      },
      select: selectListe,
    });
  });

  res.status(201).json(intervention);
});

interventionsRouter.put("/:id", async (req, res) => {
  const { id: utilisateurId, activiteId, role } = req.user;
  const data = modificationSchema.parse(req.body);

  const intervention = await prisma.$transaction(async (tx) => {
    const actuelle = await trouverIntervention(tx, req.user, req.params.id);
    const client = await resoudreClient(tx, activiteId, data, actuelle.clientId);
    // Un technicien ne peut pas réattribuer l'intervention à quelqu'un d'autre
    const technicienId = role === "TECHNICIEN" ? actuelle.technicienId : (data.technicienId ?? null);
    await verifierTechnicien(tx, activiteId, technicienId);

    return tx.intervention.update({
      where: { id: actuelle.id },
      data: {
        clientId: client.id,
        technicienId,
        objet: data.objet,
        description: data.description ?? null,
        adresse: data.adresse ?? client.adresse,
        priorite: data.priorite,
        statut: data.statut,
        datePrevue: data.datePrevue ?? null,
        dureeMinutes: data.dureeMinutes ?? null,
        ...(data.statut !== actuelle.statut && {
          historiques: { create: { ancienStatut: actuelle.statut, nouveauStatut: data.statut, utilisateurId } },
        }),
      },
      select: selectListe,
    });
  });

  res.json(intervention);
});

interventionsRouter.delete("/:id", requireRole("RESPONSABLE"), async (req, res) => {
  const intervention = await trouverIntervention(prisma, req.user, req.params.id);
  // Une facture est une pièce comptable : on ne la supprime pas avec l'intervention
  const factures = await prisma.facture.count({ where: { interventionId: intervention.id } });
  if (factures > 0) {
    throw new HttpError(409, "Cette intervention a été facturée : elle ne peut pas être supprimée. Annulez-la plutôt.");
  }
  await prisma.intervention.delete({ where: { id: intervention.id } });
  res.status(204).end();
});

// Fiche détaillée et suivi : rapport, statut, validation, pièces jointes
interventionsRouter.use("/:id", detailRouter);

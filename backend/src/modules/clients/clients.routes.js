import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { requireRole } from "../../middleware/auth.js";
import { HttpError, notFound } from "../../utils/httpError.js";
import { z } from "zod";

export const clientsRouter = Router();

// Le carnet de clients est géré par le responsable ; un technicien voit le client depuis ses interventions
clientsRouter.use(requireRole("RESPONSABLE"));

const listeSchema = z.object({
  archive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  q: z.string().trim().optional(),
});

const optionnel = z.preprocess((v) => (v === "" ? null : v), z.string().trim().nullable().optional());

const ficheSchema = z.object({
  nom: z.string().trim().min(2, "Nom trop court"),
  telephone: optionnel,
  adresse: optionnel,
  notes: optionnel,
});

const archiveSchema = z.object({ archive: z.boolean() });
const compteSchema = z.object({ compteClientId: z.string().min(1, "Compte client requis") });
const rechercheSchema = z.object({ q: z.string().trim().optional() });

const selectListe = {
  id: true,
  nom: true,
  telephone: true,
  adresse: true,
  notes: true,
  archive: true,
  // Un client « externe » n'a pas de compte sur Carnet : il a été saisi par l'activité
  compteClientId: true,
  _count: { select: { interventions: true } },
};

async function trouverClient(req) {
  const client = await prisma.client.findFirst({ where: { id: req.params.id, activiteId: req.user.activiteId } });
  if (!client) throw notFound("Client");
  return client;
}

// Un client enregistré sur Carnet est en consultation seule : aucune action de l'activité sur sa fiche
function refuserSiCarnet(client) {
  if (client.compteClientId) {
    throw new HttpError(403, "Ce client est enregistré sur Carnet : sa fiche est en consultation seule");
  }
}

// Liste de l'onglet Clients : clients externes (saisis par l'activité) et clients inscrits sur Carnet
clientsRouter.get("/", async (req, res) => {
  const { archive, q } = listeSchema.parse(req.query);
  const clients = await prisma.client.findMany({
    where: {
      activiteId: req.user.activiteId,
      archive,
      ...(q && {
        OR: [
          { nom: { contains: q, mode: "insensitive" } },
          { telephone: { contains: q } },
          { adresse: { contains: q, mode: "insensitive" } },
        ],
      }),
    },
    orderBy: { nom: "asc" },
    select: selectListe,
  });
  res.json(clients);
});

// Comptes inscrits sur Carnet qui ne sont pas encore clients de l'activité, pour les ajouter.
// Déclarée avant « /:id » pour que « comptes » ne soit pas pris pour un identifiant.
clientsRouter.get("/comptes", async (req, res) => {
  const { q } = rechercheSchema.parse(req.query);
  const comptes = await prisma.compteClient.findMany({
    where: {
      emailVerifieLe: { not: null },
      clients: { none: { activiteId: req.user.activiteId } },
      ...(q && {
        OR: [
          { nom: { contains: q, mode: "insensitive" } },
          { telephone: { contains: q } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      }),
    },
    select: { id: true, nom: true, telephone: true, ville: true },
    orderBy: { nom: "asc" },
    take: 20,
  });
  res.json(comptes);
});

clientsRouter.get("/:id", async (req, res) => {
  const client = await prisma.client.findFirst({
    where: { id: req.params.id, activiteId: req.user.activiteId },
    select: {
      ...selectListe,
      createdAt: true,
      compteClient: { select: { email: true, ville: true } },
      interventions: {
        select: {
          id: true,
          reference: true,
          objet: true,
          statut: true,
          datePrevue: true,
          technicien: { select: { nom: true } },
        },
        orderBy: [{ datePrevue: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
      },
    },
  });
  if (!client) throw notFound("Client");
  res.json(client);
});

// Nouveau client saisi par l'activité (sans compte sur Carnet)
clientsRouter.post("/", async (req, res) => {
  const data = ficheSchema.parse(req.body);
  const client = await prisma.client.create({
    data: { activiteId: req.user.activiteId, ...data },
    select: selectListe,
  });
  res.status(201).json(client);
});

// Ajout d'un client déjà inscrit sur Carnet : sa fiche reprend les coordonnées de son compte
clientsRouter.post("/depuis-compte", async (req, res) => {
  const { compteClientId } = compteSchema.parse(req.body);
  const { activiteId } = req.user;
  const compte = await prisma.compteClient.findFirst({ where: { id: compteClientId, emailVerifieLe: { not: null } } });
  if (!compte) throw notFound("Compte client");
  const existant = await prisma.client.findFirst({ where: { activiteId, compteClientId: compte.id } });
  if (existant) throw new HttpError(409, `${compte.nom} fait déjà partie de vos clients`);

  const client = await prisma.client.create({
    data: { activiteId, nom: compte.nom, telephone: compte.telephone, adresse: compte.ville, compteClientId: compte.id },
    select: selectListe,
  });
  res.status(201).json(client);
});

clientsRouter.put("/:id", async (req, res) => {
  const data = ficheSchema.parse(req.body);
  const client = await trouverClient(req);
  refuserSiCarnet(client);
  const misAJour = await prisma.client.update({ where: { id: client.id }, data, select: selectListe });
  res.json(misAJour);
});

// Archiver plutôt que supprimer : les interventions et factures du client restent consultables
clientsRouter.patch("/:id/archive", async (req, res) => {
  const { archive } = archiveSchema.parse(req.body);
  const client = await trouverClient(req);
  refuserSiCarnet(client);
  await prisma.client.update({ where: { id: client.id }, data: { archive } });
  res.status(204).end();
});

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { requireRole } from "../../middleware/auth.js";
import { HttpError, notFound } from "../../utils/httpError.js";
import { montantEnLettres } from "../../utils/lettres.js";
import { avecLogo, blocClient, corpsRecu, entete, formatDate, ouvrirPdf } from "../../utils/pdf.js";
import { prochaineReference } from "../interventions/references.js";
import { arrondi, soldes } from "./soldes.js";

export const facturationRouter = Router();

// La facturation est réservée au responsable de l'activité
facturationRouter.use(requireRole("RESPONSABLE"));

const STATUTS_PAIEMENT = ["NON_PAYEE", "PARTIELLE", "PAYEE"];

const listeSchema = z.object({
  q: z.string().trim().optional(),
  // Période d'émission, bornes calculées par le navigateur dans son fuseau
  du: z.coerce.date().optional(),
  au: z.coerce.date().optional(),
});

const paiementSchema = z.object({
  montant: z.coerce.number().positive("Montant invalide"),
  date: z.coerce.date(),
  mode: z.enum(["ESPECES", "MOBILE_MONEY", "VIREMENT", "CHEQUE", "CARTE", "AUTRE"]),
  reference: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().optional()),
});

const selectFacture = {
  id: true,
  reference: true,
  dateEmission: true,
  dateEcheance: true,
  lignes: { select: { quantite: true, prixUnitaire: true } },
  paiements: {
    select: { id: true, numeroRecu: true, montant: true, date: true, mode: true, reference: true },
    orderBy: { date: "asc" },
  },
  intervention: {
    select: { id: true, reference: true, objet: true, client: { select: { id: true, nom: true } } },
  },
};

facturationRouter.get("/factures", async (req, res) => {
  const { q, du, au } = listeSchema.parse(req.query);

  const factures = await prisma.facture.findMany({
    where: {
      activiteId: req.user.activiteId,
      ...((du || au) && { dateEmission: { ...(du && { gte: du }), ...(au && { lt: au }) } }),
      ...(q && {
        OR: [
          { reference: { contains: q, mode: "insensitive" } },
          { intervention: { objet: { contains: q, mode: "insensitive" } } },
          { intervention: { reference: { contains: q, mode: "insensitive" } } },
          { intervention: { client: { nom: { contains: q, mode: "insensitive" } } } },
        ],
      }),
    },
    select: selectFacture,
    orderBy: [{ dateEmission: "desc" }, { reference: "desc" }],
  });

  // Le statut de paiement se déduit des paiements : il est calculé ici plutôt que stocké
  const liste = factures.map(({ lignes, paiements, ...f }) => ({
    ...f,
    ...soldes({ lignes, paiements }),
    paiements: paiements.map((p) => ({ ...p, montant: Number(p.montant) })),
  }));

  const somme = (cle) => arrondi(liste.reduce((s, f) => s + f[cle], 0));
  res.json({
    factures: liste,
    totaux: { facture: somme("total"), encaisse: somme("encaisse"), resteDu: somme("resteDu") },
    compteurs: Object.fromEntries(STATUTS_PAIEMENT.map((s) => [s, liste.filter((f) => f.statut === s).length])),
  });
});

facturationRouter.post("/factures/:id/paiements", async (req, res) => {
  const data = paiementSchema.parse(req.body);

  const paiement = await prisma.$transaction(async (tx) => {
    const facture = await tx.facture.findFirst({
      where: { id: req.params.id, activiteId: req.user.activiteId },
      select: { id: true, activiteId: true, lignes: true, paiements: true },
    });
    if (!facture) throw notFound("Facture");

    const { resteDu } = soldes(facture);
    if (resteDu <= 0) throw new HttpError(409, "Cette facture est déjà entièrement payée");
    if (arrondi(data.montant) > resteDu) {
      throw new HttpError(400, `Le montant dépasse le reste dû (${resteDu})`);
    }

    return tx.paiement.create({
      data: {
        activiteId: facture.activiteId,
        factureId: facture.id,
        numeroRecu: await prochaineReference(tx, facture.activiteId, "RECU"),
        ...data,
      },
      select: { id: true, numeroRecu: true },
    });
  });

  res.status(201).json(paiement);
});

// Reçu remis au client pour un paiement ; la situation de la facture est celle juste après ce paiement
facturationRouter.get("/paiements/:id/recu", async (req, res) => {
  const paiement = await prisma.paiement.findFirst({
    where: { id: req.params.id, activiteId: req.user.activiteId },
    include: {
      activite: true,
      facture: {
        include: {
          lignes: true,
          paiements: { select: { id: true, montant: true, createdAt: true } },
          intervention: { include: { client: true } },
        },
      },
    },
  });
  if (!paiement) throw notFound("Paiement");

  const { facture } = paiement;
  const activite = await avecLogo(paiement.activite);
  const anterieur = (p) => p.createdAt < paiement.createdAt || (p.createdAt.getTime() === paiement.createdAt.getTime() && p.id <= paiement.id);
  const total = soldes({ lignes: facture.lignes, paiements: [] }).total;
  const paye = arrondi(facture.paiements.filter(anterieur).reduce((s, p) => s + Number(p.montant), 0));

  const doc = ouvrirPdf(res, paiement.numeroRecu);
  entete(doc, activite, {
    titre: "REÇU DE PAIEMENT",
    reference: paiement.numeroRecu,
    dateDocument: `Le ${formatDate(paiement.date)}`,
  });
  blocClient(doc, facture.intervention);
  corpsRecu(doc, {
    client: facture.intervention.client.nom,
    montant: paiement.montant,
    montantLettres: montantEnLettres(paiement.montant, activite.devise),
    mode: paiement.mode,
    reference: paiement.reference,
    facture,
    situation: { total, paye, reste: arrondi(Math.max(0, total - paye)) },
    devise: activite.devise,
  });
  doc.end();
});

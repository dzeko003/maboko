import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { arrondi, soldes } from "../facturation/soldes.js";
import { perimetre } from "../interventions/acces.js";

export const dashboardRouter = Router();

const STATUTS = ["A_PLANIFIER", "PLANIFIEE", "EN_COURS", "TERMINEE", "ANNULEE"];

const schema = z.object({
  // Début de la journée du navigateur : les rendez-vous « à partir d'aujourd'hui » dépendent de son fuseau
  depuis: z.coerce.date().optional(),
});

dashboardRouter.get("/", async (req, res) => {
  const { depuis = new Date() } = schema.parse(req.query);
  const base = perimetre(req.user);
  const responsable = req.user.role === "RESPONSABLE";

  const [parStatut, prochains, factures] = await Promise.all([
    prisma.intervention.groupBy({ by: ["statut"], where: base, _count: { _all: true } }),
    prisma.intervention.findMany({
      where: { ...base, statut: { in: ["PLANIFIEE", "EN_COURS"] }, datePrevue: { gte: depuis } },
      select: {
        id: true,
        reference: true,
        objet: true,
        adresse: true,
        statut: true,
        datePrevue: true,
        client: { select: { nom: true } },
        technicien: { select: { nom: true } },
      },
      orderBy: { datePrevue: "asc" },
      take: 8,
    }),
    // Les montants ne concernent que le responsable
    responsable
      ? prisma.facture.findMany({
          where: { activiteId: req.user.activiteId },
          select: { lignes: { select: { quantite: true, prixUnitaire: true } }, paiements: { select: { montant: true } } },
        })
      : null,
  ]);

  const compteurs = Object.fromEntries(STATUTS.map((s) => [s, 0]));
  parStatut.forEach((g) => (compteurs[g.statut] = g._count._all));

  let facturation = null;
  if (factures) {
    const liste = factures.map(soldes);
    const somme = (cle) => arrondi(liste.reduce((s, f) => s + f[cle], 0));
    facturation = {
      facture: somme("total"),
      encaisse: somme("encaisse"),
      resteDu: somme("resteDu"),
      aEncaisser: liste.filter((f) => f.resteDu > 0).length,
    };
  }

  res.json({
    compteurs,
    total: Object.values(compteurs).reduce((a, b) => a + b, 0),
    prochains,
    facturation,
  });
});

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { HttpError, notFound } from "../../utils/httpError.js";

export const espaceClientRouter = Router();

const avisSchema = z.object({
  note: z.number().int().min(1).max(5),
  commentaire: z.string().trim().max(1000).nullable().optional(),
});

function compteClientId(req) {
  const id = req.user?.id ?? req.user?.sub;
  if (!id || req.user?.role !== "CLIENT") throw new HttpError(401, "Session client invalide");
  return id;
}

espaceClientRouter.get("/", async (req, res) => {
  const id = compteClientId(req);
  const [client, interventions] = await Promise.all([
    prisma.compteClient.findUnique({
      where: { id },
      select: { id: true, nom: true, email: true, telephone: true, ville: true },
    }),
    prisma.intervention.findMany({
      where: { client: { is: { compteClientId: id, archive: false } } },
      select: {
        id: true,
        reference: true,
        objet: true,
        description: true,
        adresse: true,
        statut: true,
        datePrevue: true,
        createdAt: true,
        client: { select: { nom: true, activite: { select: { nom: true } } } },
        technicien: { select: { id: true, nom: true, slug: true, profilPublic: true } },
        avis: { select: { id: true, note: true, commentaire: true, createdAt: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    }),
  ]);

  if (!client) throw notFound("Compte client");
  res.json({ client, interventions });
});

espaceClientRouter.post("/interventions/:id/avis", async (req, res) => {
  const clientId = compteClientId(req);
  const id = z.string().uuid().parse(req.params.id);
  const { note, commentaire } = avisSchema.parse(req.body);

  const intervention = await prisma.intervention.findFirst({
    where: { id, client: { is: { compteClientId: clientId, archive: false } } },
    select: { id: true, statut: true, technicienId: true, avis: { select: { id: true } } },
  });
  if (!intervention) throw notFound("Intervention");
  if (intervention.statut !== "TERMINEE") throw new HttpError(409, "Cette intervention n'est pas terminée");
  if (!intervention.technicienId) throw new HttpError(409, "Aucun technicien n'est associé à cette intervention");
  if (intervention.avis) throw new HttpError(409, "Un avis existe déjà pour cette intervention");

  try {
    const avis = await prisma.avis.create({
      data: {
        interventionId: intervention.id,
        technicienId: intervention.technicienId,
        compteClientId: clientId,
        note,
        commentaire: commentaire?.trim() || null,
      },
      select: { id: true, note: true, commentaire: true, createdAt: true },
    });
    res.status(201).json(avis);
  } catch (error) {
    if (error?.code === "P2002") throw new HttpError(409, "Un avis existe déjà pour cette intervention");
    throw error;
  }
});

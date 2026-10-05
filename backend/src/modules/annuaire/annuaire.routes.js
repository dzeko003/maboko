import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { notFound } from "../../utils/httpError.js";
import { urlPublique } from "../../utils/stockage.js";

export const annuaireRouter = Router();

const filtresSchema = z.object({
  q: z.string().trim().max(100).optional(),
  ville: z.string().trim().max(100).optional(),
});

const slugSchema = z.string().trim().min(1).max(100);

const champsPublics = {
  id: true,
  nom: true,
  slug: true,
  metier: true,
  bio: true,
  telephone: true,
  whatsapp: true,
  ville: true,
  quartier: true,
  photoChemin: true,
  activite: { select: { nom: true } },
  avis: {
    orderBy: { createdAt: "desc" },
    select: { id: true, note: true, commentaire: true, createdAt: true, compteClient: { select: { nom: true } } },
  },
};

// Réalisations : seulement sur la page d'un technicien, pas dans la liste de l'annuaire
const champsPage = {
  ...champsPublics,
  realisations: {
    orderBy: { createdAt: "desc" },
    select: { id: true, titre: true, description: true, photoChemin: true },
  },
};

function urlOuNull(chemin) {
  try {
    return urlPublique(chemin);
  } catch {
    return null;
  }
}

function presenterProfil(utilisateur) {
  const { photoChemin, avis, realisations, ...profil } = utilisateur;
  const noteMoyenne = avis.length
    ? avis.reduce((total, avisClient) => total + avisClient.note, 0) / avis.length
    : 0;

  let photoUrl = null;
  if (photoChemin) {
    try {
      photoUrl = urlPublique(photoChemin);
    } catch {
      // Le profil reste consultable si le stockage public n'est pas configuré.
    }
  }

  return {
    ...profil,
    photoUrl,
    noteMoyenne: Math.round(noteMoyenne * 10) / 10,
    nbAvis: avis.length,
    // Seul le prénom de l'auteur est public
    avis: avis.map(({ compteClient, ...a }) => ({ ...a, auteur: compteClient?.nom?.split(" ")[0] ?? null })),
    ...(realisations && {
      realisations: realisations.map(({ photoChemin: chemin, ...r }) => ({ ...r, photoUrl: urlOuNull(chemin) })),
    }),
  };
}

annuaireRouter.get("/", async (req, res) => {
  const filtres = filtresSchema.parse(req.query);
  const q = filtres.q || undefined;
  const ville = filtres.ville || undefined;

  const profils = await prisma.utilisateur.findMany({
    where: {
      actif: true,
      profilPublic: true,
      role: { in: ["RESPONSABLE", "TECHNICIEN"] },
      slug: { not: null },
      ...(ville ? { ville: { equals: ville, mode: "insensitive" } } : {}),
      ...(q
        ? {
            OR: [
              { nom: { contains: q, mode: "insensitive" } },
              { metier: { contains: q, mode: "insensitive" } },
              { ville: { contains: q, mode: "insensitive" } },
              { quartier: { contains: q, mode: "insensitive" } },
              { activite: { nom: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    select: champsPublics,
    orderBy: [{ nom: "asc" }],
  });

  res.json(profils.map(presenterProfil));
});

annuaireRouter.get("/:slug", async (req, res) => {
  const slug = slugSchema.parse(req.params.slug);
  const profil = await prisma.utilisateur.findFirst({
    where: { slug, actif: true, profilPublic: true, role: { in: ["RESPONSABLE", "TECHNICIEN"] } },
    select: champsPage,
  });

  if (!profil) throw notFound("Profil public");
  res.json(presenterProfil(profil));
});

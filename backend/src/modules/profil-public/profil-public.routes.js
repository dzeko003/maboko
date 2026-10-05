import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { HttpError, notFound } from "../../utils/httpError.js";
import { uploadImage } from "../../middleware/upload.js";
import { BUCKETS, dossiers, envoyerFichier, supprimerFichier, urlPublique } from "../../utils/stockage.js";

export const profilPublicRouter = Router();

const profilSchema = z.object({
  nom: z.string().trim().min(1).max(120).optional(),
  profilPublic: z.boolean().optional(),
  slug: z.string().trim().max(80).nullable().optional(),
  metier: z.string().trim().max(120).nullable().optional(),
  bio: z.string().trim().max(2000).nullable().optional(),
  telephone: z.string().trim().max(40).nullable().optional(),
  whatsapp: z.string().trim().max(40).nullable().optional(),
  ville: z.string().trim().max(100).nullable().optional(),
  quartier: z.string().trim().max(100).nullable().optional(),
}).refine((data) => Object.keys(data).length > 0, { message: "Aucune modification reçue" });

const selectProfil = {
  id: true,
  nom: true,
  email: true,
  role: true,
  profilPublic: true,
  slug: true,
  metier: true,
  bio: true,
  telephone: true,
  whatsapp: true,
  ville: true,
  quartier: true,
  photoChemin: true,
  activite: { select: { nom: true } },
};

function utilisateurId(req) {
  const id = req.user?.id ?? req.user?.sub ?? req.user?.utilisateurId;
  if (!id) throw new HttpError(401, "Session invalide");
  return id;
}

function slugifier(texte) {
  return texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function presenter(profil) {
  const { photoChemin, ...donnees } = profil;
  let photoUrl = null;
  if (photoChemin) {
    try {
      photoUrl = urlPublique(photoChemin);
    } catch {
      // L'édition du profil reste possible sans configuration R2 publique.
    }
  }
  return { ...donnees, photoUrl };
}

profilPublicRouter.get("/", async (req, res) => {
  const profil = await prisma.utilisateur.findUnique({
    where: { id: utilisateurId(req) },
    select: selectProfil,
  });
  if (!profil) throw notFound("Utilisateur");
  res.json(presenter(profil));
});

profilPublicRouter.patch("/", async (req, res) => {
  const id = utilisateurId(req);
  const modifications = profilSchema.parse(req.body);
  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id },
    select: { id: true, nom: true, slug: true, profilPublic: true, metier: true, ville: true, telephone: true, whatsapp: true },
  });
  if (!utilisateur) throw notFound("Utilisateur");

  // Un profil visible dans l'annuaire doit permettre de savoir qui contacter, où et comment
  const apres = { ...utilisateur, ...modifications };
  if (apres.profilPublic) {
    const manquants = [
      !apres.metier && "le métier",
      !apres.ville && "la ville",
      !apres.telephone && !apres.whatsapp && "un numéro (téléphone ou WhatsApp)",
    ].filter(Boolean);
    if (manquants.length) {
      const liste = manquants.length > 1 ? `${manquants.slice(0, -1).join(", ")} et ${manquants.at(-1)}` : manquants[0];
      throw new HttpError(400, `Pour être visible dans l'annuaire, renseignez ${liste}.`);
    }
  }

  const data = { ...modifications };
  if (data.slug !== undefined) {
    const valeur = data.slug?.trim() || null;
    data.slug = valeur ? slugifier(valeur) : null;
    if (valeur && !data.slug) throw new HttpError(400, "Le lien public doit contenir des lettres ou des chiffres");
  }

  const profilPublic = data.profilPublic ?? undefined;
  if (profilPublic && !data.slug) {
    const nom = data.nom ?? utilisateur.nom;
    data.slug = utilisateur.slug || slugifier(nom);
    if (!data.slug) throw new HttpError(400, "Ajoutez un nom avant d'activer le profil public");
  }

  try {
    const profil = await prisma.utilisateur.update({
      where: { id },
      data,
      select: selectProfil,
    });
    res.json(presenter(profil));
  } catch (error) {
    if (error?.code === "P2002" && error?.meta?.target?.includes("slug")) {
      throw new HttpError(409, "Ce lien public est déjà utilisé");
    }
    throw error;
  }
});

// Photo de profil : bucket public (affichée dans l'annuaire sans connexion)
profilPublicRouter.post("/photo", uploadImage, async (req, res) => {
  const id = utilisateurId(req);
  const ancien = await prisma.utilisateur.findUnique({ where: { id }, select: { photoChemin: true } });
  if (!ancien) throw notFound("Utilisateur");

  const fichier = await envoyerFichier({ bucket: BUCKETS.public, dossier: dossiers.profil(id), fichier: req.file });
  const profil = await prisma.utilisateur.update({
    where: { id },
    data: { photoChemin: fichier.chemin, photoMime: fichier.typeMime },
    select: selectProfil,
  });
  // L'ancienne photo n'est supprimée qu'une fois la nouvelle enregistrée
  await supprimerFichier(BUCKETS.public, ancien.photoChemin).catch(() => {});
  res.json(presenter(profil));
});

profilPublicRouter.delete("/photo", async (req, res) => {
  const id = utilisateurId(req);
  const ancien = await prisma.utilisateur.findUnique({ where: { id }, select: { photoChemin: true } });
  if (!ancien) throw notFound("Utilisateur");
  const profil = await prisma.utilisateur.update({
    where: { id },
    data: { photoChemin: null, photoMime: null },
    select: selectProfil,
  });
  await supprimerFichier(BUCKETS.public, ancien.photoChemin).catch(() => {});
  res.json(presenter(profil));
});

/* ---------- Réalisations : galerie de travaux présentée sur le profil public ---------- */

const MAX_REALISATIONS = 12;

const realisationSchema = z.object({
  titre: z.string().trim().min(2, "Titre trop court").max(120),
  description: z.preprocess((v) => (v === "" ? null : v), z.string().trim().max(500).nullable().optional()),
});

const selectRealisation = { id: true, titre: true, description: true, photoChemin: true, createdAt: true };

function presenterRealisation({ photoChemin, ...realisation }) {
  let photoUrl = null;
  try {
    photoUrl = urlPublique(photoChemin);
  } catch {
    // Sans stockage public configuré, la réalisation reste listée sans image
  }
  return { ...realisation, photoUrl };
}

async function trouverRealisation(req) {
  const realisation = await prisma.realisation.findFirst({
    where: { id: req.params.realisationId, utilisateurId: utilisateurId(req) },
  });
  if (!realisation) throw notFound("Réalisation");
  return realisation;
}

profilPublicRouter.get("/realisations", async (req, res) => {
  const realisations = await prisma.realisation.findMany({
    where: { utilisateurId: utilisateurId(req) },
    select: selectRealisation,
    orderBy: { createdAt: "desc" },
  });
  res.json(realisations.map(presenterRealisation));
});

// Envoi en multipart : la photo (« fichier ») et les champs titre / description
profilPublicRouter.post("/realisations", uploadImage, async (req, res) => {
  const id = utilisateurId(req);
  const data = realisationSchema.parse(req.body);
  if (!req.file) throw new HttpError(400, "Ajoutez une photo de la réalisation");
  const nombre = await prisma.realisation.count({ where: { utilisateurId: id } });
  if (nombre >= MAX_REALISATIONS) {
    throw new HttpError(409, `Vous avez atteint ${MAX_REALISATIONS} réalisations : supprimez-en une pour en ajouter.`);
  }

  const fichier = await envoyerFichier({ bucket: BUCKETS.public, dossier: `${dossiers.profil(id)}/realisations`, fichier: req.file });
  const realisation = await prisma.realisation.create({
    data: { utilisateurId: id, ...data, photoChemin: fichier.chemin, photoMime: fichier.typeMime },
    select: selectRealisation,
  });
  res.status(201).json(presenterRealisation(realisation));
});

profilPublicRouter.put("/realisations/:realisationId", async (req, res) => {
  const data = realisationSchema.parse(req.body);
  const realisation = await trouverRealisation(req);
  const misAJour = await prisma.realisation.update({ where: { id: realisation.id }, data, select: selectRealisation });
  res.json(presenterRealisation(misAJour));
});

profilPublicRouter.delete("/realisations/:realisationId", async (req, res) => {
  const realisation = await trouverRealisation(req);
  await prisma.realisation.delete({ where: { id: realisation.id } });
  await supprimerFichier(BUCKETS.public, realisation.photoChemin).catch(() => {});
  res.status(204).end();
});

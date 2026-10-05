import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { requireRole } from "../../middleware/auth.js";
import { uploadLogo } from "../../middleware/upload.js";
import { HttpError, notFound } from "../../utils/httpError.js";
import { nouveauJeton } from "../../utils/jetons.js";
import { envoyerMail, mailInvitation, mailNouveauMotDePasse } from "../../utils/mail.js";
import { BUCKETS, dossiers, envoyerFichier, supprimerFichier, urlPublique } from "../../utils/stockage.js";

export const activiteRouter = Router();

// Les liens envoyés aux membres de l'équipe restent valables 3 jours
const VALIDITE_INVITATION_HEURES = 72;

const optionnel = z.preprocess((v) => (v === "" ? null : v), z.string().trim().nullable().optional());

const activiteSchema = z.object({
  nom: z.string().trim().min(2, "Nom de l'activité trop court"),
  telephone: optionnel,
  adresse: optionnel,
  devise: z.enum(["XAF", "EUR", "USD"]),
  infosFacturation: optionnel,
});

const membreSchema = z.object({
  nom: z.string().trim().min(2, "Nom trop court"),
  telephone: optionnel,
});

const invitationSchema = membreSchema.extend({
  email: z.string().trim().toLowerCase().email("E-mail invalide"),
});

const actifSchema = z.object({ actif: z.boolean() });

const selectMembre = {
  id: true,
  nom: true,
  email: true,
  role: true,
  telephone: true,
  whatsapp: true,
  actif: true,
  emailVerifieLe: true,
};

function urlOuNull(chemin) {
  if (!chemin) return null;
  try {
    return urlPublique(chemin);
  } catch {
    return null;
  }
}

const selectActivite = { id: true, nom: true, telephone: true, adresse: true, devise: true, infosFacturation: true, logoChemin: true };

function presenterActivite({ logoChemin, ...activite }) {
  return { ...activite, logoUrl: urlOuNull(logoChemin) };
}

// Un membre de l'équipe : jamais le responsable lui-même par cette voie
async function trouverMembre(req) {
  const membre = await prisma.utilisateur.findFirst({
    where: { id: req.params.id, activiteId: req.user.activiteId, role: "TECHNICIEN" },
  });
  if (!membre) throw notFound("Technicien");
  return membre;
}

async function envoyerLien(membre, jeton, modeleMail) {
  const [activite, responsable] = await Promise.all([
    prisma.activite.findUnique({ where: { id: membre.activiteId }, select: { nom: true } }),
    prisma.utilisateur.findFirst({ where: { activiteId: membre.activiteId, role: "RESPONSABLE" }, select: { nom: true } }),
  ]);
  const lien = `${env.CLIENT_URL}/invitation?jeton=${jeton}`;
  try {
    await envoyerMail({
      to: membre.email,
      ...modeleMail({
        nom: membre.nom,
        activite: activite.nom,
        invitePar: responsable?.nom ?? activite.nom,
        lien,
        heures: VALIDITE_INVITATION_HEURES,
      }),
    });
  } catch (err) {
    // Le compte existe : le responsable peut renvoyer le lien depuis la liste de l'équipe
    console.error("Envoi du lien impossible :", err.message);
    throw new HttpError(502, "Le compte est enregistré mais l'e-mail n'a pas pu être envoyé. Réessayez « Nouveau mot de passe ».");
  }
}

/* ---------- Membres actifs à qui l'on peut attribuer une intervention ---------- */

activiteRouter.get("/techniciens", async (req, res) => {
  const techniciens = await prisma.utilisateur.findMany({
    where: { activiteId: req.user.activiteId, actif: true },
    select: { id: true, nom: true, role: true, metier: true },
    orderBy: [{ role: "asc" }, { nom: "asc" }],
  });

  res.json(techniciens);
});

/* ---------- Informations de l'activité (en-tête des devis, factures et rapports) ---------- */

activiteRouter.get("/", async (req, res) => {
  const activite = await prisma.activite.findUnique({
    where: { id: req.user.activiteId },
    select: selectActivite,
  });
  if (!activite) throw notFound("Activité");
  res.json(presenterActivite(activite));
});

activiteRouter.put("/", requireRole("RESPONSABLE"), async (req, res) => {
  const data = activiteSchema.parse(req.body);
  const activite = await prisma.activite.update({ where: { id: req.user.activiteId }, data, select: selectActivite });
  res.json(presenterActivite(activite));
});

// Logo : bucket public, affiché sur la page et intégré dans les PDF
activiteRouter.post("/logo", requireRole("RESPONSABLE"), uploadLogo, async (req, res) => {
  const { activiteId } = req.user;
  const ancien = await prisma.activite.findUnique({ where: { id: activiteId }, select: { logoChemin: true } });
  const fichier = await envoyerFichier({ bucket: BUCKETS.public, dossier: dossiers.logo(activiteId), fichier: req.file });
  const activite = await prisma.activite.update({
    where: { id: activiteId },
    data: { logoChemin: fichier.chemin, logoMime: fichier.typeMime },
    select: selectActivite,
  });
  // L'ancien logo n'est supprimé qu'une fois le nouveau enregistré
  await supprimerFichier(BUCKETS.public, ancien?.logoChemin).catch(() => {});
  res.json(presenterActivite(activite));
});

activiteRouter.delete("/logo", requireRole("RESPONSABLE"), async (req, res) => {
  const { activiteId } = req.user;
  const ancien = await prisma.activite.findUnique({ where: { id: activiteId }, select: { logoChemin: true } });
  const activite = await prisma.activite.update({
    where: { id: activiteId },
    data: { logoChemin: null, logoMime: null },
    select: selectActivite,
  });
  await supprimerFichier(BUCKETS.public, ancien?.logoChemin).catch(() => {});
  res.json(presenterActivite(activite));
});

/* ---------- Équipe : le responsable invite et gère ses techniciens ---------- */

activiteRouter.get("/equipe", requireRole("RESPONSABLE"), async (req, res) => {
  const membres = await prisma.utilisateur.findMany({
    where: { activiteId: req.user.activiteId },
    select: selectMembre,
    orderBy: [{ role: "asc" }, { actif: "desc" }, { nom: "asc" }],
  });
  res.json(membres.map(({ emailVerifieLe, ...m }) => ({ ...m, invitationEnAttente: !emailVerifieLe })));
});

// Création du compte d'un technicien : il reçoit un e-mail pour l'activer et choisir son mot de passe
activiteRouter.post("/equipe", requireRole("RESPONSABLE"), async (req, res) => {
  const data = invitationSchema.parse(req.body);
  const [user, compte] = await Promise.all([
    prisma.utilisateur.findUnique({ where: { email: data.email }, select: { id: true } }),
    prisma.compteClient.findUnique({ where: { email: data.email }, select: { id: true } }),
  ]);
  if (user || compte) throw new HttpError(409, "Un compte existe déjà avec cet e-mail");

  const { jeton, data: jetonData } = nouveauJeton(VALIDITE_INVITATION_HEURES);
  const membre = await prisma.utilisateur.create({
    data: {
      activiteId: req.user.activiteId,
      role: "TECHNICIEN",
      nom: data.nom,
      email: data.email,
      telephone: data.telephone,
      whatsapp: data.telephone,
      // Mot de passe aléatoire inutilisable : le technicien choisit le sien via le lien d'invitation
      motDePasseHash: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12),
      ...jetonData,
    },
    select: { id: true, nom: true, email: true, activiteId: true },
  });

  await envoyerLien(membre, jeton, mailInvitation);
  res.status(201).json({ id: membre.id, nom: membre.nom, email: membre.email, invitationEnAttente: true });
});

activiteRouter.put("/equipe/:id", requireRole("RESPONSABLE"), async (req, res) => {
  const data = membreSchema.parse(req.body);
  const membre = await trouverMembre(req);
  await prisma.utilisateur.update({ where: { id: membre.id }, data });
  res.status(204).end();
});

// Renvoie l'invitation (compte pas encore activé) ou un lien pour choisir un nouveau mot de passe
activiteRouter.post("/equipe/:id/lien", requireRole("RESPONSABLE"), async (req, res) => {
  const membre = await trouverMembre(req);
  if (!membre.actif) throw new HttpError(409, "Réactivez ce compte avant de lui envoyer un lien");
  const { jeton, data } = nouveauJeton(VALIDITE_INVITATION_HEURES);
  await prisma.utilisateur.update({ where: { id: membre.id }, data });
  await envoyerLien(membre, jeton, membre.emailVerifieLe ? mailNouveauMotDePasse : mailInvitation);
  res.json({ message: `Un lien a été envoyé à ${membre.email}.` });
});

// Désactiver plutôt que supprimer : ses interventions passées restent attribuées et lisibles
activiteRouter.patch("/equipe/:id/actif", requireRole("RESPONSABLE"), async (req, res) => {
  const { actif } = actifSchema.parse(req.body);
  const membre = await trouverMembre(req);
  await prisma.utilisateur.update({
    where: { id: membre.id },
    // Un compte désactivé ne doit plus pouvoir utiliser un lien déjà envoyé
    data: { actif, ...(!actif && { jetonActivationHash: null, jetonActivationExpire: null }) },
  });
  res.status(204).end();
});

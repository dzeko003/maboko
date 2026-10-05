import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { HttpError } from "../../utils/httpError.js";
import { empreinte, nouveauJeton } from "../../utils/jetons.js";
import { envoyerMail, mailActivation } from "../../utils/mail.js";
import { fermerSession, ouvrirSession } from "../../utils/session.js";

export const authRouter = Router();

const texte = (min, message) => z.string().trim().min(min, message);
const optionnel = z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().optional());
const email = z.string().trim().toLowerCase().email("E-mail invalide");

const commun = {
  nom: texte(2, "Nom trop court"),
  email,
  motDePasse: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères"),
  telephone: optionnel,
  ville: optionnel,
};

const inscriptionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("client"), ...commun }),
  z.object({
    type: z.literal("pro"),
    ...commun,
    nomActivite: texte(2, "Nom de l'activité trop court"),
    metier: optionnel,
    devise: z.enum(["XAF", "EUR", "USD"]).default("XAF"),
  }),
]);

const connexionSchema = z.object({ email, motDePasse: z.string().min(1, "Mot de passe requis") });
const activationSchema = z.object({ jeton: z.string().min(1, "Lien d'activation invalide") });
const renvoiSchema = z.object({ email });

// Contenu de la session, lu par requireAuth et exposé dans req.user.
// Les clients ont le rôle CLIENT et pas d'activiteId.
const sessionPro = (user) => ({ id: user.id, activiteId: user.activiteId, role: user.role });
const sessionClient = (compte) => ({ id: compte.id, role: "CLIENT" });

const selectPro = {
  id: true,
  nom: true,
  email: true,
  role: true,
  actif: true,
  activite: { select: { id: true, nom: true, devise: true } },
};
const selectClient = { id: true, nom: true, email: true, telephone: true, ville: true };

async function profil(session) {
  if (session.role === "CLIENT") {
    const compte = await prisma.compteClient.findUnique({ where: { id: session.id }, select: selectClient });
    return compte && { type: "client", ...compte };
  }
  const user = await prisma.utilisateur.findUnique({ where: { id: session.id }, select: selectPro });
  if (!user?.actif) return null;
  const { actif: _actif, ...rest } = user;
  return { type: "pro", ...rest };
}

async function emailPris(adresse) {
  const [user, compte] = await Promise.all([
    prisma.utilisateur.findUnique({ where: { email: adresse }, select: { id: true } }),
    prisma.compteClient.findUnique({ where: { email: adresse }, select: { id: true } }),
  ]);
  return Boolean(user || compte);
}

// ——— Activation par e-mail ———

const VALIDITE_HEURES = 24;

async function envoyerActivation({ nom, email: destinataire }, jeton) {
  const lien = `${env.CLIENT_URL}/activation?jeton=${jeton}`;
  try {
    await envoyerMail({ to: destinataire, ...mailActivation({ nom, lien, heures: VALIDITE_HEURES }) });
  } catch (err) {
    // Le compte existe déjà : l'utilisateur pourra redemander le lien depuis l'écran de connexion
    console.error("Envoi du mail d'activation impossible :", err.message);
  }
}

// Cherche un compte non activé, professionnel ou client
async function compteNonActive(where) {
  const user = await prisma.utilisateur.findFirst({ where: { ...where, emailVerifieLe: null } });
  if (user) return { compte: user, modele: prisma.utilisateur, session: sessionPro };
  const client = await prisma.compteClient.findFirst({ where: { ...where, emailVerifieLe: null } });
  if (client) return { compte: client, modele: prisma.compteClient, session: sessionClient };
  return null;
}

// ——— Routes ———

authRouter.post("/inscription", async (req, res) => {
  const data = inscriptionSchema.parse(req.body);
  if (await emailPris(data.email)) throw new HttpError(409, "Un compte existe déjà avec cet e-mail");

  const motDePasseHash = await bcrypt.hash(data.motDePasse, 12);
  const { nom, telephone, ville } = data;
  const { jeton, data: activation } = nouveauJeton(VALIDITE_HEURES);

  if (data.type === "client") {
    await prisma.compteClient.create({
      data: { nom, email: data.email, telephone, ville, motDePasseHash, ...activation },
    });
  } else {
    await prisma.activite.create({
      data: {
        nom: data.nomActivite,
        telephone,
        devise: data.devise,
        utilisateurs: {
          create: {
            nom,
            email: data.email,
            motDePasseHash,
            role: "RESPONSABLE",
            metier: data.metier,
            ville,
            telephone,
            whatsapp: telephone,
            ...activation,
          },
        },
      },
    });
  }

  // Pas de session ici : le compte doit d'abord être activé via le lien envoyé par e-mail
  await envoyerActivation({ nom, email: data.email }, jeton);
  res.status(201).json({ email: data.email });
});

// Un seul formulaire pour les deux types de comptes : on cherche d'abord un professionnel, puis un client
authRouter.post("/connexion", async (req, res) => {
  const { email: adresse, motDePasse } = connexionSchema.parse(req.body);

  const user = await prisma.utilisateur.findUnique({ where: { email: adresse } });
  const compte = user ? null : await prisma.compteClient.findUnique({ where: { email: adresse } });
  const trouve = user ?? compte;

  const valide = trouve && (await bcrypt.compare(motDePasse, trouve.motDePasseHash));
  if (!valide) throw new HttpError(401, "E-mail ou mot de passe incorrect");
  if (!trouve.emailVerifieLe) {
    throw new HttpError(403, "Activez votre compte avec le lien reçu par e-mail.", "EMAIL_NON_VERIFIE");
  }
  if (user && !user.actif) throw new HttpError(403, "Ce compte est désactivé");

  const session = user ? sessionPro(user) : sessionClient(compte);
  ouvrirSession(res, session);
  res.json(await profil(session));
});

// Ouverture du lien reçu par e-mail : active le compte et connecte directement l'utilisateur
authRouter.post("/activation", async (req, res) => {
  const { jeton } = activationSchema.parse(req.body);

  const trouve = await compteNonActive({ jetonActivationHash: empreinte(jeton) });
  if (!trouve || trouve.compte.jetonActivationExpire < new Date()) {
    throw new HttpError(400, "Ce lien d'activation est invalide ou a expiré.", "JETON_INVALIDE");
  }

  const { compte, modele, session } = trouve;
  await modele.update({
    where: { id: compte.id },
    data: { emailVerifieLe: new Date(), jetonActivationHash: null, jetonActivationExpire: null },
  });

  ouvrirSession(res, session(compte));
  res.json(await profil(session(compte)));
});

// Réponse identique que le compte existe ou non, pour ne pas révéler quels e-mails sont inscrits
authRouter.post("/activation/renvoyer", async (req, res) => {
  const { email: adresse } = renvoiSchema.parse(req.body);

  const trouve = await compteNonActive({ email: adresse });
  if (trouve) {
    const { jeton, data } = nouveauJeton(VALIDITE_HEURES);
    await trouve.modele.update({ where: { id: trouve.compte.id }, data });
    await envoyerActivation(trouve.compte, jeton);
  }

  res.json({ message: "Si un compte non activé existe pour cette adresse, un nouveau lien vient d'être envoyé." });
});

// Lien d'invitation (technicien créé par le responsable) ou de nouveau mot de passe :
// la personne choisit son mot de passe, le compte est activé et la session ouverte
const invitationSchema = z.object({
  jeton: z.string().min(1, "Lien invalide"),
  motDePasse: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères"),
});

authRouter.post("/invitation", async (req, res) => {
  const { jeton, motDePasse } = invitationSchema.parse(req.body);
  const user = await prisma.utilisateur.findFirst({ where: { jetonActivationHash: empreinte(jeton) } });
  if (!user || user.jetonActivationExpire < new Date()) {
    throw new HttpError(400, "Ce lien est invalide ou a expiré. Demandez-en un nouveau à votre responsable.", "JETON_INVALIDE");
  }
  if (!user.actif) throw new HttpError(403, "Ce compte est désactivé");

  await prisma.utilisateur.update({
    where: { id: user.id },
    data: {
      motDePasseHash: await bcrypt.hash(motDePasse, 12),
      emailVerifieLe: user.emailVerifieLe ?? new Date(),
      jetonActivationHash: null,
      jetonActivationExpire: null,
    },
  });

  const session = sessionPro(user);
  ouvrirSession(res, session);
  res.json(await profil(session));
});

const motDePasseSchema = z.object({
  actuel: z.string().min(1, "Mot de passe actuel requis"),
  nouveau: z.string().min(8, "Le nouveau mot de passe doit faire au moins 8 caractères"),
});

authRouter.put("/mot-de-passe", requireAuth, async (req, res) => {
  const { actuel, nouveau } = motDePasseSchema.parse(req.body);
  const modele = req.user.role === "CLIENT" ? prisma.compteClient : prisma.utilisateur;
  const compte = await modele.findUnique({ where: { id: req.user.id } });
  if (!compte || !(await bcrypt.compare(actuel, compte.motDePasseHash))) {
    throw new HttpError(400, "Le mot de passe actuel est incorrect");
  }
  await modele.update({ where: { id: compte.id }, data: { motDePasseHash: await bcrypt.hash(nouveau, 12) } });
  res.status(204).end();
});

authRouter.post("/deconnexion", (req, res) => {
  fermerSession(res);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await profil(req.user);
  if (!user) {
    fermerSession(res);
    throw new HttpError(401, "Session expirée");
  }
  res.json(user);
});

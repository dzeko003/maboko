import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../src/db/prisma.js";

const EMAIL_RESPONSABLE = "demo@carnet.test";
const EMAILS_CLIENTS = ["mireille@carnet.test", "christian@carnet.test"];
const ANNEE = new Date().getFullYear();

const reference = (prefixe, n) => `${prefixe}-${ANNEE}-${String(n).padStart(4, "0")}`;

function jour(decalage, heure, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + decalage);
  d.setHours(heure, minute, 0, 0);
  return d;
}

async function nettoyer() {
  const ancienne = await prisma.activite.findFirst({ where: { utilisateurs: { some: { email: EMAIL_RESPONSABLE } } } });
  if (ancienne) {
    await prisma.paiement.deleteMany({ where: { activiteId: ancienne.id } });
    await prisma.facture.deleteMany({ where: { activiteId: ancienne.id } });
    await prisma.intervention.deleteMany({ where: { activiteId: ancienne.id } });
    await prisma.activite.delete({ where: { id: ancienne.id } });
  }
  await prisma.compteClient.deleteMany({ where: { email: { in: EMAILS_CLIENTS } } });
}

async function main() {
  await nettoyer();
  const hash = await bcrypt.hash("demo12345", 12);

  const activite = await prisma.activite.create({
    data: {
      nom: "Mabiala Services",
      telephone: "+242 06 612 34 56",
      adresse: "Avenue Matsoua, Bacongo, Brazzaville",
      devise: "XAF",
      infosFacturation: "RCCM CG-BZV-01-2024-B12-00345 · NIU M2400000123456",
    },
  });

  const responsable = await prisma.utilisateur.create({
    data: {
      activiteId: activite.id,
      nom: "Jean-Claude Mabiala",
      email: EMAIL_RESPONSABLE,
      motDePasseHash: hash,
      emailVerifieLe: new Date(),
      role: "RESPONSABLE",
      telephone: "+242 06 612 34 56",
    },
  });

  const grace = await prisma.utilisateur.create({
    data: {
      activiteId: activite.id,
      nom: "Grâce Nkounkou",
      email: "grace@carnet.test",
      motDePasseHash: hash,
      emailVerifieLe: new Date(),
      role: "TECHNICIEN",
      profilPublic: true,
      slug: "grace-nkounkou",
      metier: "Électricienne",
      bio: "Installations et dépannages électriques, mise aux normes des tableaux. 8 ans d'expérience.",
      telephone: "+242 06 845 12 30",
      whatsapp: "+242 06 845 12 30",
      ville: "Brazzaville",
      quartier: "Moungali",
    },
  });

  const arnaud = await prisma.utilisateur.create({
    data: {
      activiteId: activite.id,
      nom: "Arnaud Moukala",
      email: "arnaud@carnet.test",
      motDePasseHash: hash,
      emailVerifieLe: new Date(),
      role: "TECHNICIEN",
      profilPublic: true,
      slug: "arnaud-moukala",
      metier: "Plombier",
      bio: "Fuites, chauffe-eau, sanitaires et surpresseurs. Intervention rapide à Brazzaville sud.",
      telephone: "+242 05 530 77 81",
      whatsapp: "+242 05 530 77 81",
      ville: "Brazzaville",
      quartier: "Bacongo",
    },
  });

  const mireille = await prisma.compteClient.create({
    data: { nom: "Mireille Ngoma", email: EMAILS_CLIENTS[0], telephone: "+242 06 401 22 18", ville: "Brazzaville", motDePasseHash: hash, emailVerifieLe: new Date() },
  });
  const christian = await prisma.compteClient.create({
    data: { nom: "Christian Loubaki", email: EMAILS_CLIENTS[1], telephone: "+242 06 955 43 21", ville: "Brazzaville", motDePasseHash: hash, emailVerifieLe: new Date() },
  });

  const fichesClients = [
    { nom: "Mireille Ngoma", telephone: "+242 06 401 22 18", adresse: "Rue Mbemba, Bacongo, Brazzaville", notes: "Portail vert, sonner deux fois", compteClientId: mireille.id },
    { nom: "Résidence Les Manguiers", telephone: "+242 05 700 10 10", adresse: "Avenue de la Paix, Poto-Poto, Brazzaville", notes: "Contact : gardien de l'immeuble" },
    { nom: "Christian Loubaki", telephone: "+242 06 955 43 21", adresse: "Plateau des 15 ans, Moungali, Brazzaville", compteClientId: christian.id },
    { nom: "Boulangerie du Marché Total", telephone: "+242 05 612 90 90", adresse: "Marché Total, Bacongo, Brazzaville", notes: "Intervenir avant 6h" },
    { nom: "Nadège Samba", telephone: "+242 06 230 66 04", adresse: "Ouenzé, Brazzaville" },
    { nom: "Hôtel Le Fleuve", telephone: "+242 05 344 18 00", adresse: "Boulevard Denis Sassou Nguesso, Centre-ville, Brazzaville", notes: "Facturer au service comptable" },
    { nom: "Patrick Mampouya", telephone: "+242 06 118 72 45", adresse: "Talangaï, Brazzaville", archive: true },
  ];
  const clients = [];
  for (const fiche of fichesClients) {
    clients.push(await prisma.client.create({ data: { activiteId: activite.id, ...fiche } }));
  }

  const donnees = [
    [0, "Fuite sous l'évier de la cuisine", "EN_COURS", "HAUTE", jour(0, 9), arnaud],
    [1, "Remplacement du chauffe-eau, appartement 12", "PLANIFIEE", "NORMALE", jour(0, 11, 30), arnaud],
    [3, "Panne électrique du four", "PLANIFIEE", "URGENTE", jour(0, 14), grace],
    [2, "Installation d'un tableau électrique", "PLANIFIEE", "BASSE", jour(1, 10), grace],
    [1, "Contrôle du surpresseur", "PLANIFIEE", "NORMALE", jour(2, 8, 30), null],
    [5, "Pose de trois climatiseurs", "A_PLANIFIER", "NORMALE", null, null],
    [4, "Chasse d'eau qui coule", "A_PLANIFIER", "BASSE", null, null],
    [0, "Remplacement du mitigeur de douche", "TERMINEE", "NORMALE", jour(-6, 15), arnaud],
    [2, "Prises qui chauffent au salon", "TERMINEE", "HAUTE", jour(-4, 9), grace],
    [5, "Mise aux normes de l'éclairage du hall", "TERMINEE", "NORMALE", jour(-12, 8), grace],
    [6, "Débouchage canalisation", "ANNULEE", "BASSE", jour(-20, 10), arnaud],
  ];

  const interventions = [];
  for (const [i, [client, objet, statut, priorite, datePrevue, technicien]] of donnees.entries()) {
    const termine = statut === "TERMINEE";
    const historiques = [{ nouveauStatut: "A_PLANIFIER", utilisateurId: responsable.id }];
    if (statut !== "A_PLANIFIER") historiques.push({ ancienStatut: "A_PLANIFIER", nouveauStatut: statut, utilisateurId: technicien?.id ?? responsable.id });

    interventions.push(
      await prisma.intervention.create({
        data: {
          activiteId: activite.id,
          reference: reference("INT", i + 1),
          clientId: clients[client].id,
          technicienId: technicien?.id ?? null,
          objet,
          adresse: clients[client].adresse,
          statut,
          priorite,
          datePrevue,
          dureeMinutes: datePrevue ? 90 : null,
          avisToken: termine ? crypto.randomBytes(18).toString("base64url") : null,
          historiques: { create: historiques },
          ...((termine || statut === "EN_COURS") && {
            rapport: {
              create: {
                constats: termine ? "Équipement défectueux constaté sur place." : "Joint du siphon usé, fuite goutte à goutte.",
                causePresumee: "Usure normale",
                travauxRecommandes: objet,
                ...(termine && {
                  travauxRealises: objet,
                  materiauxUtilises: "Pièces de remplacement, consommables",
                  valideParNom: clients[client].nom,
                  valideLe: datePrevue,
                }),
              },
            },
          }),
        },
      }),
    );
  }

  const lignesMitigeur = [
    ["MATERIEL", "Mitigeur thermostatique", 1, 45000],
    ["MAIN_OEUVRE", "Dépose et pose", 1, 15000],
  ];
  const lignesPrises = [
    ["MATERIEL", "Prise 16A encastrée", 4, 3500],
    ["MATERIEL", "Câble 2,5 mm² (mètre)", 12, 900],
    ["MAIN_OEUVRE", "Remplacement et contrôle du circuit", 1, 25000],
  ];
  const lignesHall = [
    ["MATERIEL", "Réglette LED 120 cm", 10, 12000],
    ["MATERIEL", "Disjoncteur 10A", 2, 6500],
    ["MAIN_OEUVRE", "Mise aux normes (2 jours)", 2, 40000],
  ];
  const lignesClim = [
    ["MATERIEL", "Climatiseur split 12 000 BTU", 3, 285000],
    ["MAIN_OEUVRE", "Pose et mise en service", 3, 35000],
  ];
  const lignesChauffeEau = [
    ["MATERIEL", "Chauffe-eau 100 L", 1, 165000],
    ["MAIN_OEUVRE", "Remplacement", 1, 30000],
  ];

  const devisDonnees = [
    [7, "ACCEPTE", lignesMitigeur, jour(-8, 10), jour(-7, 16)],
    [8, "ACCEPTE", lignesPrises, jour(-5, 11), jour(-5, 18)],
    [9, "ACCEPTE", lignesHall, jour(-15, 9), jour(-14, 12)],
    [5, "ENVOYE", lignesClim, jour(-1, 15), null],
    [1, "BROUILLON", lignesChauffeEau, null, null],
  ];
  const versLignes = (lignes) =>
    lignes.map(([type, designation, quantite, prixUnitaire], ordre) => ({ type, designation, quantite, prixUnitaire, ordre }));

  const devis = [];
  for (const [i, [intervention, etat, lignes, envoyeLe, reponduLe]] of devisDonnees.entries()) {
    devis.push(
      await prisma.devis.create({
        data: {
          activiteId: activite.id,
          reference: reference("DEV", i + 1),
          interventionId: interventions[intervention].id,
          etat,
          envoyeLe,
          reponduLe,
          lignes: { create: versLignes(lignes) },
        },
      }),
    );
  }

  const facturesDonnees = [
    [0, lignesMitigeur, jour(-6, 17), [[60000, jour(-6, 17), "MOBILE_MONEY", "MP240611.1532.A12345"]]],
    [1, lignesPrises, jour(-4, 12), [[30000, jour(-4, 12), "ESPECES", null]]],
    [2, lignesHall, jour(-12, 14), []],
  ];
  let recus = 0;
  for (const [i, [d, lignes, dateEmission, paiements]] of facturesDonnees.entries()) {
    const echeance = new Date(dateEmission);
    echeance.setDate(echeance.getDate() + 7);
    await prisma.facture.create({
      data: {
        activiteId: activite.id,
        reference: reference("FAC", i + 1),
        interventionId: devis[d].interventionId,
        devisId: devis[d].id,
        dateEmission,
        dateEcheance: echeance,
        lignes: { create: versLignes(lignes) },
        paiements: {
          create: paiements.map(([montant, date, mode, ref]) => ({
            activiteId: activite.id,
            montant,
            date,
            mode,
            reference: ref,
            numeroRecu: reference("REC", ++recus),
          })),
        },
      },
    });
  }

  await prisma.avis.create({
    data: {
      interventionId: interventions[7].id,
      technicienId: arnaud.id,
      compteClientId: mireille.id,
      note: 5,
      commentaire: "Arrivé à l'heure, travail propre et prix annoncé respecté. Je recommande.",
    },
  });
  await prisma.avis.create({
    data: {
      interventionId: interventions[8].id,
      technicienId: grace.id,
      compteClientId: christian.id,
      note: 4,
      commentaire: "Problème réglé rapidement, explications claires.",
    },
  });

  await prisma.compteur.createMany({
    data: [
      { activiteId: activite.id, type: "INTERVENTION", annee: ANNEE, valeur: donnees.length },
      { activiteId: activite.id, type: "DEVIS", annee: ANNEE, valeur: devisDonnees.length },
      { activiteId: activite.id, type: "FACTURE", annee: ANNEE, valeur: facturesDonnees.length },
      { activiteId: activite.id, type: "RECU", annee: ANNEE, valeur: recus },
    ],
  });

  console.log(
    `Démo créée : 3 utilisateurs, 2 comptes clients, ${clients.length} clients, ${interventions.length} interventions, ` +
      `${devis.length} devis, ${facturesDonnees.length} factures, 2 avis.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

import PDFDocument from "pdfkit";
import { BUCKETS, lireFichier } from "./stockage.js";

const MARGE = 50;
const ENCRE = "#1a1a1a";
const GRIS = "#6b6b6b";
const TRAIT = "#e2e2e2";
const ACCENT = "#db0000";

// Les polices standard du PDF ne connaissent pas les espaces fines utilisées par Intl en français
const propre = (texte) => String(texte ?? "").replace(/[  ]/g, " ");

const nombre = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
const date = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
const dateHeure = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" });

export const formatMontant = (valeur, devise) =>
  propre(`${nombre.format(Number(valeur) || 0)} ${devise === "XAF" ? "FCFA" : devise}`);
export const formatDate = (valeur) => (valeur ? propre(date.format(new Date(valeur))) : "");
export const formatDateHeure = (valeur) => (valeur ? propre(dateHeure.format(new Date(valeur))) : "");

const LIBELLES_TYPE = { MAIN_OEUVRE: "Main-d'œuvre", MATERIEL: "Matériel" };

// Ouvre un PDF envoyé directement dans la réponse HTTP
export function ouvrirPdf(res, nomFichier) {
  const doc = new PDFDocument({ size: "A4", margin: MARGE, info: { Title: nomFichier } });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${nomFichier}.pdf"`);
  doc.pipe(res);
  return doc;
}

const largeur = (doc) => doc.page.width - 2 * MARGE;

function verifierPlace(doc, hauteur) {
  if (doc.y + hauteur > doc.page.height - MARGE) doc.addPage();
}

// Charge le logo de l'activité (bucket public) pour l'en-tête ; un logo illisible n'empêche pas le PDF
export async function avecLogo(activite) {
  if (!activite.logoChemin) return { ...activite, logo: null };
  const logo = await lireFichier(BUCKETS.public, activite.logoChemin).catch(() => null);
  return { ...activite, logo };
}

// En-tête : logo et coordonnées de l'activité à gauche, type et référence du document à droite
export function entete(doc, activite, { titre, reference, dateDocument }) {
  const haut = doc.y;
  let yTexte = haut;
  if (activite.logo) {
    try {
      doc.image(activite.logo, MARGE, haut, { fit: [150, 56] });
      yTexte = haut + 64;
    } catch {
      // Image non reconnue par pdfkit : l'en-tête s'affiche sans logo
    }
  }
  doc.font("Helvetica-Bold").fontSize(16).fillColor(ENCRE).text(propre(activite.nom), MARGE, yTexte, { width: 280 });
  doc.font("Helvetica").fontSize(9).fillColor(GRIS);
  [activite.adresse, activite.telephone, activite.infosFacturation].filter(Boolean).forEach((ligne) => {
    doc.text(propre(ligne), { width: 280 });
  });
  const basGauche = doc.y;

  doc.font("Helvetica-Bold").fontSize(18).fillColor(ACCENT).text(propre(titre), MARGE, haut, { width: largeur(doc), align: "right" });
  doc.font("Helvetica").fontSize(10).fillColor(ENCRE).text(propre(reference), { width: largeur(doc), align: "right" });
  if (dateDocument) doc.fillColor(GRIS).text(propre(dateDocument), { width: largeur(doc), align: "right" });

  doc.y = Math.max(basGauche, doc.y) + 20;
  doc.moveTo(MARGE, doc.y).lineTo(MARGE + largeur(doc), doc.y).strokeColor(TRAIT).stroke();
  doc.moveDown(1.2);
}

// Deux colonnes : client et intervention
export function blocClient(doc, intervention) {
  const haut = doc.y;
  const colonne = largeur(doc) / 2 - 10;
  const { client } = intervention;

  doc.font("Helvetica-Bold").fontSize(9).fillColor(GRIS).text("CLIENT", MARGE, haut, { width: colonne });
  doc.font("Helvetica-Bold").fontSize(11).fillColor(ENCRE).text(propre(client.nom), { width: colonne });
  doc.font("Helvetica").fontSize(10);
  [client.adresse, client.telephone].filter(Boolean).forEach((l) => doc.text(propre(l), { width: colonne }));
  const basGauche = doc.y;

  const x = MARGE + colonne + 20;
  doc.font("Helvetica-Bold").fontSize(9).fillColor(GRIS).text("INTERVENTION", x, haut, { width: colonne });
  doc.font("Helvetica-Bold").fontSize(11).fillColor(ENCRE).text(propre(intervention.objet), x, doc.y, { width: colonne });
  doc.font("Helvetica").fontSize(10).text(propre(intervention.reference), x, doc.y, { width: colonne });
  if (intervention.adresse) doc.text(propre(intervention.adresse), x, doc.y, { width: colonne });
  if (intervention.datePrevue) doc.text(`Prévue le ${formatDateHeure(intervention.datePrevue)}`, x, doc.y, { width: colonne });

  doc.x = MARGE;
  doc.y = Math.max(basGauche, doc.y) + 24;
}

// Tableau des lignes (devis ou facture) suivi du total
export function tableauLignes(doc, lignes, devise) {
  const l = largeur(doc);
  const colonnes = [
    { titre: "Désignation", x: 0, w: l * 0.42 },
    { titre: "Type", x: l * 0.42, w: l * 0.16 },
    { titre: "Qté", x: l * 0.58, w: l * 0.1, align: "right" },
    { titre: "Prix unitaire", x: l * 0.68, w: l * 0.16, align: "right" },
    { titre: "Total", x: l * 0.84, w: l * 0.16, align: "right" },
  ];

  const ligne = (valeurs, { gras = false, couleur = ENCRE } = {}) => {
    doc.font(gras ? "Helvetica-Bold" : "Helvetica").fontSize(9.5).fillColor(couleur);
    const hauteur = Math.max(...valeurs.map((v, i) => doc.heightOfString(propre(v), { width: colonnes[i].w - 6 })));
    verifierPlace(doc, hauteur + 12);
    const y = doc.y;
    valeurs.forEach((v, i) => {
      doc.text(propre(v), MARGE + colonnes[i].x, y, { width: colonnes[i].w - 6, align: colonnes[i].align ?? "left" });
    });
    doc.y = y + hauteur + 6;
    doc.moveTo(MARGE, doc.y).lineTo(MARGE + l, doc.y).strokeColor(TRAIT).stroke();
    doc.y += 6;
  };

  ligne(colonnes.map((c) => c.titre), { gras: true, couleur: GRIS });
  let total = 0;
  for (const item of lignes) {
    const montant = Number(item.quantite) * Number(item.prixUnitaire);
    total += montant;
    ligne([
      item.designation,
      LIBELLES_TYPE[item.type] ?? item.type,
      nombre.format(Number(item.quantite)),
      formatMontant(item.prixUnitaire, devise),
      formatMontant(montant, devise),
    ]);
  }

  verifierPlace(doc, 30);
  doc.moveDown(0.5);
  doc.font("Helvetica-Bold").fontSize(12).fillColor(ENCRE).text(`Total ${formatMontant(total, devise)}`, MARGE, doc.y, {
    width: l,
    align: "right",
  });
  doc.moveDown(1.5);
  return total;
}

const LIBELLES_MODE = {
  ESPECES: "Espèces",
  MOBILE_MONEY: "Mobile Money",
  VIREMENT: "Virement",
  CHEQUE: "Chèque",
  CARTE: "Carte",
  AUTRE: "Autre",
};
const VERT = "#1f8a4c";

// Paiements reçus sur une facture, puis récapitulatif : total, déjà payé, reste à payer
export function blocPaiements(doc, paiements, total, devise) {
  if (!paiements.length) return;
  const l = largeur(doc);
  verifierPlace(doc, 60 + paiements.length * 20);

  doc.font("Helvetica-Bold").fontSize(10).fillColor(GRIS).text("PAIEMENTS REÇUS", MARGE, doc.y, { width: l });
  doc.moveDown(0.4);

  let paye = 0;
  for (const p of paiements) {
    paye += Number(p.montant);
    const y = doc.y;
    const mode = [LIBELLES_MODE[p.mode] ?? p.mode, p.reference].filter(Boolean).join(" · ");
    doc.font("Helvetica").fontSize(9.5).fillColor(ENCRE);
    doc.text(formatDate(p.date), MARGE, y, { width: l * 0.2 });
    doc.text(propre(p.numeroRecu ?? ""), MARGE + l * 0.2, y, { width: l * 0.2 });
    doc.text(propre(mode), MARGE + l * 0.4, y, { width: l * 0.35 });
    doc.text(formatMontant(p.montant, devise), MARGE + l * 0.75, y, { width: l * 0.25, align: "right" });
    doc.y = y + 16;
  }
  doc.moveTo(MARGE, doc.y).lineTo(MARGE + l, doc.y).strokeColor(TRAIT).stroke();
  doc.moveDown(0.6);

  const reste = Math.max(0, Math.round((total - paye) * 100) / 100);
  const recap = (libelle, valeur, options = {}) => {
    const y = doc.y;
    doc.font(options.gras ? "Helvetica-Bold" : "Helvetica").fontSize(options.taille ?? 10).fillColor(options.couleur ?? ENCRE);
    doc.text(libelle, MARGE + l * 0.45, y, { width: l * 0.3, align: "right" });
    doc.text(valeur, MARGE + l * 0.75, y, { width: l * 0.25, align: "right" });
    doc.y = y + (options.taille ?? 10) + 8;
  };
  recap("Total de la facture", formatMontant(total, devise));
  recap("Déjà payé", `- ${formatMontant(paye, devise)}`, { couleur: VERT });
  recap("Reste à payer", formatMontant(reste, devise), { gras: true, taille: 12, couleur: reste > 0 ? ACCENT : ENCRE });

  if (reste <= 0) {
    doc.moveDown(0.3);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(VERT).text("FACTURE ACQUITTÉE", MARGE, doc.y, { width: l, align: "right" });
  }
  doc.x = MARGE;
  doc.moveDown(1.2);
}

// Corps d'un reçu : somme reçue (chiffres et lettres), objet du paiement, situation de la facture
export function corpsRecu(doc, { client, montant, montantLettres, mode, reference, facture, situation, devise }) {
  const l = largeur(doc);
  const haut = doc.y;
  const hauteur = 112;
  doc.roundedRect(MARGE, haut, l, hauteur, 6).fillAndStroke("#fafafa", TRAIT);

  doc.font("Helvetica").fontSize(10).fillColor(GRIS).text(`Reçu de ${propre(client)} la somme de`, MARGE + 20, haut + 16, { width: l - 40 });
  doc.font("Helvetica-Bold").fontSize(24).fillColor(ENCRE).text(formatMontant(montant, devise), MARGE + 20, doc.y + 4, { width: l - 40 });
  doc.font("Helvetica-Oblique").fontSize(10).fillColor(ENCRE).text(`soit : ${propre(montantLettres)}`, MARGE + 20, doc.y + 4, { width: l - 40 });
  const mode_ = [LIBELLES_MODE[mode] ?? mode, reference && `réf. ${reference}`].filter(Boolean).join(" · ");
  doc.font("Helvetica").fontSize(10).fillColor(GRIS).text(`Mode de paiement : ${propre(mode_)}`, MARGE + 20, doc.y + 6, { width: l - 40 });

  doc.y = haut + hauteur + 18;
  doc.x = MARGE;
  doc.font("Helvetica").fontSize(10.5).fillColor(ENCRE).text(
    `En règlement ${situation.reste > 0 ? "partiel " : ""}de la facture ${propre(facture.reference)} du ${formatDate(facture.dateEmission)}.`,
    MARGE,
    doc.y,
    { width: l },
  );
  doc.moveDown(1.2);

  const recap = (libelle, valeur, options = {}) => {
    const y = doc.y;
    doc.font(options.gras ? "Helvetica-Bold" : "Helvetica").fontSize(options.taille ?? 10).fillColor(options.couleur ?? ENCRE);
    doc.text(libelle, MARGE + l * 0.4, y, { width: l * 0.35, align: "right" });
    doc.text(valeur, MARGE + l * 0.75, y, { width: l * 0.25, align: "right" });
    doc.y = y + (options.taille ?? 10) + 8;
  };
  recap("Montant de la facture", formatMontant(situation.total, devise));
  recap("Total payé à ce jour", formatMontant(situation.paye, devise), { couleur: VERT });
  recap("Reste à payer", formatMontant(situation.reste, devise), {
    gras: true,
    taille: 12,
    couleur: situation.reste > 0 ? ACCENT : ENCRE,
  });
  if (situation.reste <= 0) {
    doc.moveDown(0.3);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(VERT).text("FACTURE SOLDÉE", MARGE, doc.y, { width: l, align: "right" });
  }

  // Signature de l'entreprise
  doc.moveDown(3);
  verifierPlace(doc, 80);
  const y = doc.y;
  doc.font("Helvetica").fontSize(9).fillColor(GRIS).text("Signature et cachet", MARGE + l * 0.6, y, { width: l * 0.4 });
  doc.moveTo(MARGE + l * 0.6, y + 60).lineTo(MARGE + l, y + 60).strokeColor(TRAIT).stroke();
  doc.y = y + 70;
  doc.x = MARGE;
}

// Section titrée avec un texte libre (ignorée si vide)
export function section(doc, titre, texte) {
  if (!texte) return;
  verifierPlace(doc, 50);
  doc.font("Helvetica-Bold").fontSize(10).fillColor(GRIS).text(propre(titre).toUpperCase(), MARGE, doc.y, { width: largeur(doc) });
  doc.moveDown(0.3);
  doc.font("Helvetica").fontSize(10.5).fillColor(ENCRE).text(propre(texte), { width: largeur(doc) });
  doc.moveDown(1);
}

export function titreSection(doc, titre) {
  verifierPlace(doc, 60);
  doc.moveDown(0.5);
  doc.font("Helvetica-Bold").fontSize(13).fillColor(ENCRE).text(propre(titre), MARGE, doc.y, { width: largeur(doc) });
  doc.moveDown(0.6);
}

// Grille de photos (JPEG/PNG uniquement : pdfkit ne lit pas le WebP)
export function photos(doc, images) {
  const taille = 150;
  const espace = 12;
  const parLigne = Math.floor((largeur(doc) + espace) / (taille + espace));
  images.forEach((image, i) => {
    if (i % parLigne === 0) {
      if (i > 0) doc.y += taille + espace;
      verifierPlace(doc, taille);
    }
    const x = MARGE + (i % parLigne) * (taille + espace);
    doc.image(image, x, doc.y, { fit: [taille, taille], align: "center", valign: "center" });
  });
  if (images.length) doc.y += taille + espace;
  doc.x = MARGE;
}

export function pied(doc, texte) {
  verifierPlace(doc, 40);
  doc.moveDown(1);
  doc.font("Helvetica").fontSize(9).fillColor(GRIS).text(propre(texte), MARGE, doc.y, { width: largeur(doc) });
}

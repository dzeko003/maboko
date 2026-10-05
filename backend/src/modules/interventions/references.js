// Numérotation annuelle par activité : INT-2026-0001, DEV-2026-0001, FAC-2026-0001, REC-2026-0001
const PREFIXES = { INTERVENTION: "INT", DEVIS: "DEV", FACTURE: "FAC", RECU: "REC" };

export async function prochaineReference(tx, activiteId, type) {
  const annee = new Date().getFullYear();
  const { valeur } = await tx.compteur.upsert({
    where: { activiteId_type_annee: { activiteId, type, annee } },
    create: { activiteId, type, annee, valeur: 1 },
    update: { valeur: { increment: 1 } },
  });
  return `${PREFIXES[type]}-${annee}-${String(valeur).padStart(4, "0")}`;
}

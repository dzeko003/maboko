// Montants arrondis au centime pour éviter les écarts de calcul en virgule flottante
export const arrondi = (n) => Math.round(n * 100) / 100;

// Total, encaissé, reste dû et statut de paiement d'une facture (lignes et paiements chargés)
export function soldes(facture) {
  const total = arrondi(facture.lignes.reduce((s, l) => s + Number(l.quantite) * Number(l.prixUnitaire), 0));
  const encaisse = arrondi(facture.paiements.reduce((s, p) => s + Number(p.montant), 0));
  const resteDu = arrondi(Math.max(0, total - encaisse));
  const statut = encaisse <= 0 ? "NON_PAYEE" : resteDu > 0 ? "PARTIELLE" : "PAYEE";
  return { total, encaisse, resteDu, statut };
}

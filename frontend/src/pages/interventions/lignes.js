export const TYPES_LIGNE = { MAIN_OEUVRE: 'Main-d’œuvre', MATERIEL: 'Matériel' }

let compteur = 0
export const nouvelleLigne = (type = 'MAIN_OEUVRE') => ({
  cle: ++compteur,
  type,
  designation: '',
  quantite: '1',
  prixUnitaire: '',
})

export const montantLigne = (l) => (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0)

// Lignes pour l'API, sans la clé locale
export const lignesPourApi = (lignes) => lignes.map(({ cle, ...l }) => l) // eslint-disable-line no-unused-vars

export const STATUTS = [
  { value: 'A_PLANIFIER', label: 'À planifier', tone: 'warn' },
  { value: 'PLANIFIEE', label: 'Planifiée', tone: 'info' },
  { value: 'EN_COURS', label: 'En cours', tone: 'err' },
  { value: 'TERMINEE', label: 'Terminée', tone: 'ok' },
  { value: 'ANNULEE', label: 'Annulée', tone: 'neutral' },
]

export const PRIORITES = {
  BASSE: { label: 'Basse', tone: 'neutral' },
  NORMALE: { label: 'Normale', tone: 'neutral' },
  HAUTE: { label: 'Haute', tone: 'warn' },
  URGENTE: { label: 'Urgente', tone: 'err' },
}

export const getStatut = (value) => STATUTS.find((s) => s.value === value) ?? STATUTS[0]

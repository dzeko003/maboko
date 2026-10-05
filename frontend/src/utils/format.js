const montant = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'XAF',
  maximumFractionDigits: 0,
})

const date = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
const dateHeure = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
const jourHeure = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export const formatMontant = (valeur) => montant.format(Number(valeur) || 0)
export const formatDate = (valeur) => (valeur ? date.format(new Date(valeur)) : '')
export const formatDateHeure = (valeur) => (valeur ? dateHeure.format(new Date(valeur)) : '')
// « 30 sept., 09:00 »
export const formatJourHeure = (valeur) => (valeur ? jourHeure.format(new Date(valeur)) : '')

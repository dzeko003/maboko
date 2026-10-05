import { useState } from 'react'
import { api } from '../../api/client.js'

const CHAMPS_RAPPORT = [
  'constats',
  'causePresumee',
  'travauxRecommandes',
  'avancement',
  'travauxRealises',
  'materiauxUtilises',
  'observations',
]

const rapportVide = (rapport) => Object.fromEntries(CHAMPS_RAPPORT.map((c) => [c, rapport?.[c] ?? '']))

// Les deux sections enregistrent le rapport complet : un seul état, partagé
export function useRapport(intervention) {
  const [rapport, setRapport] = useState(() => rapportVide(intervention.rapport))
  const [etat, setEtat] = useState({ envoi: false, message: null, erreur: null })

  const changer = (champ) => (e) => setRapport((r) => ({ ...r, [champ]: e.target.value }))

  async function enregistrer() {
    setEtat({ envoi: true, message: null, erreur: null })
    try {
      await api.put(`/interventions/${intervention.id}/rapport`, rapport)
      setEtat({ envoi: false, message: 'Enregistré', erreur: null })
    } catch (err) {
      setEtat({ envoi: false, message: null, erreur: err.message })
    }
  }

  return { rapport, changer, enregistrer, etat }
}

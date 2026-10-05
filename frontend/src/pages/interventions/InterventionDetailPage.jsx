import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api/client.js'
import { Badge } from '../../components/ui/Badge.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Card } from '../../components/ui/Card.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { formatJourHeure } from '../../utils/format.js'
import { PRIORITES, getStatut } from '../../utils/interventions.js'
import { DevisSection, FacturesSection } from './Chiffrage.jsx'
import { FormulaireIntervention } from './FormulaireIntervention.jsx'
import { Diagnostic, TravauxRapport } from './SuiviIntervention.jsx'
import { useRapport } from './useRapport.js'
import './InterventionDetailPage.css'

const prenom = (nom) => nom.split(' ')[0]

function lienWhatsApp(intervention) {
  const numero = (intervention.technicien.whatsapp ?? intervention.technicien.telephone ?? '').replace(/\D/g, '')
  if (!numero) return null
  const lignes = [
    `Bonjour ${prenom(intervention.technicien.nom)},`,
    `Intervention ${intervention.reference} : ${intervention.objet}`,
    intervention.datePrevue && `Prévue le ${formatJourHeure(intervention.datePrevue)}`,
    intervention.adresse && `Adresse : ${intervention.adresse}`,
    `Client : ${intervention.client.nom}${intervention.client.telephone ? ` (${intervention.client.telephone})` : ''}`,
  ]
  return `https://wa.me/${numero}?text=${encodeURIComponent(lignes.filter(Boolean).join('\n'))}`
}

function ActionsStatut({ intervention, onChange }) {
  const [confirmation, setConfirmation] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState(null)
  const { statut } = intervention

  async function changer(nouveau) {
    setEnvoi(true)
    setErreur(null)
    try {
      await api.patch(`/interventions/${intervention.id}/statut`, { statut: nouveau })
      setConfirmation(false)
      onChange()
    } catch (err) {
      setErreur(err.message)
    } finally {
      setEnvoi(false)
    }
  }

  if (statut === 'TERMINEE' || statut === 'ANNULEE') return null

  return (
    <div className="detail__actions">
      {confirmation ? (
        <>
          <span className="muted">Annuler cette intervention ?</span>
          <Button size="sm" onClick={() => changer('ANNULEE')} disabled={envoi}>
            Oui, annuler
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirmation(false)} disabled={envoi}>
            Non
          </Button>
        </>
      ) : (
        <>
          {(statut === 'A_PLANIFIER' || statut === 'PLANIFIEE') && (
            <Button onClick={() => changer('EN_COURS')} disabled={envoi}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4Z" />
              </svg>
              Démarrer l'intervention
            </Button>
          )}
          <Button variant="ghost" onClick={() => setConfirmation(true)} disabled={envoi}>
            Annuler l'intervention
          </Button>
        </>
      )}
      {erreur && <p className="field__error detail__actions-erreur">{erreur}</p>}
    </div>
  )
}

function Attribution({ intervention, onModifier }) {
  const { technicien } = intervention
  const lien = technicien && lienWhatsApp(intervention)
  return (
    <Card className="detail__carte detail__attribution">
      <span className="detail__attribution-texte">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
        {technicien ? (
          <>
            Attribuée à <strong>{technicien.nom}</strong>
          </>
        ) : (
          <span className="muted">Non attribuée</span>
        )}
      </span>
      {lien ? (
        <a href={lien} target="_blank" rel="noreferrer" className="btn btn--sm detail__whatsapp">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
          Prévenir {prenom(technicien.nom)} sur WhatsApp
        </a>
      ) : (
        !technicien && (
          <Button variant="secondary" size="sm" onClick={onModifier}>
            Attribuer
          </Button>
        )
      )}
    </Card>
  )
}

function Informations({ intervention, onModifier }) {
  const elements = [
    ['Date prévue', intervention.datePrevue ? formatJourHeure(intervention.datePrevue) : 'Non planifiée'],
    ['Durée estimée', intervention.dureeMinutes ? `${intervention.dureeMinutes} min` : '—'],
    ['Technicien', intervention.technicien?.nom ?? 'Non attribuée'],
    ['Adresse', intervention.adresse ?? '—'],
  ]
  return (
    <Card
      title="Informations"
      className="detail__carte"
      action={
        <Button variant="ghost" size="sm" onClick={onModifier}>
          Modifier
        </Button>
      }
    >
      <dl className="detail__infos">
        {elements.map(([terme, valeur]) => (
          <div key={terme}>
            <dt className="muted">{terme}</dt>
            <dd>{valeur}</dd>
          </div>
        ))}
        {intervention.description && (
          <div className="detail__infos-plein">
            <dt className="muted">Description du besoin</dt>
            <dd>{intervention.description}</dd>
          </div>
        )}
      </dl>
    </Card>
  )
}

function Historique({ historiques }) {
  return (
    <Card title="Historique" className="detail__carte">
      <ol className="historique">
        {historiques.map((h) => (
          <li key={h.id}>
            <p>
              {h.ancienStatut ? `${getStatut(h.ancienStatut).label} → ` : 'Créée · '}
              {getStatut(h.nouveauStatut).label}
            </p>
            <p className="muted">
              {formatJourHeure(h.createdAt)}
              {h.utilisateur && ` · ${h.utilisateur.nom}`}
            </p>
          </li>
        ))}
      </ol>
    </Card>
  )
}

function Fiche({ intervention, reload }) {
  const [edition, setEdition] = useState(false)
  const rapport = useRapport(intervention)
  const statut = getStatut(intervention.statut)
  const priorite = PRIORITES[intervention.priorite] ?? PRIORITES.NORMALE

  function modifier() {
    setEdition(true)
  }

  return (
    <div className="detail">
      <header className="detail__entete">
        <div>
          <Link to="/dashboard/interventions" className="detail__retour">
            ‹ Interventions
          </Link>
          <p className="detail__ref">{intervention.reference}</p>
          <h1 className="detail__titre">{intervention.objet}</h1>
          <div className="detail__badges">
            <Badge tone={statut.tone}>{statut.label}</Badge>
            <Badge tone={priorite.tone}>{priorite.label}</Badge>
          </div>
        </div>
        <ActionsStatut intervention={intervention} onChange={reload} />
      </header>

      <div className="detail__corps">
        <div className="detail__principal">
          <Attribution intervention={intervention} onModifier={modifier} />
          {edition ? (
            <FormulaireIntervention
              interventionId={intervention.id}
              onAnnuler={() => setEdition(false)}
              onEnregistree={() => {
                setEdition(false)
                reload()
              }}
            />
          ) : (
            <Informations intervention={intervention} onModifier={modifier} />
          )}
          <Diagnostic intervention={intervention} rapport={rapport} onChange={reload} />
          <DevisSection intervention={intervention} onChange={reload} />
          <TravauxRapport intervention={intervention} rapport={rapport} onChange={reload} />
          <FacturesSection intervention={intervention} onChange={reload} />
        </div>

        <aside className="detail__cote">
          <Card title="Client" className="detail__carte">
            <p className="detail__client-nom">{intervention.client.nom}</p>
            {intervention.client.adresse && <p className="muted">{intervention.client.adresse}</p>}
            {intervention.client.telephone && (
              <a href={`tel:${intervention.client.telephone.replace(/\s/g, '')}`} className="detail__telephone">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z" />
                </svg>
                {intervention.client.telephone}
              </a>
            )}
          </Card>
          <Historique historiques={intervention.historiques} />
        </aside>
      </div>
    </div>
  )
}

export default function InterventionDetailPage() {
  const { id } = useParams()
  const { data, error, reload } = useFetch(`/interventions/${id}`)

  if (!data) {
    return (
      <div className="detail">
        <Link to="/dashboard/interventions" className="detail__retour">
          ‹ Interventions
        </Link>
        {error ? (
          <div className="detail__etat">
            <p>Impossible de charger l'intervention.</p>
            <p className="muted">{error}</p>
            <Button variant="secondary" size="sm" onClick={reload}>
              Réessayer
            </Button>
          </div>
        ) : (
          <p className="detail__etat muted">Chargement de l'intervention…</p>
        )}
      </div>
    )
  }

  // La clé remet l'état local (rapport saisi, édition) à zéro quand on change d'intervention
  return <Fiche key={data.id} intervention={data} reload={reload} />
}

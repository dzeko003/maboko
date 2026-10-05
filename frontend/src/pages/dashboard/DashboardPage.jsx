import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Card } from '../../components/ui/Card.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { formatMontant } from '../../utils/format.js'
import { getStatut } from '../../utils/interventions.js'
import './DashboardPage.css'

const aujourdHui = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const heure = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
const jourCourt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })

const ICONES = {
  A_PLANIFIER: <path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
  PLANIFIEE: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  EN_COURS: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4Z" />,
  TERMINEE: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  ANNULEE: <path d="m12 3 9 5-9 5-9-5ZM3 13l9 5 9-5" />,
  facture: <path d="M6 2h9l5 5v15H6ZM14 2v6h6M9 13h6M9 17h6" />,
  encaisse: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  resteDu: (
    <>
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M3 10h18M16 15h2" />
    </>
  ),
}

function Icone({ nom }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONES[nom]}
    </svg>
  )
}

// Statuts suivis dans « Suivi de l'activité » ; « Annulée » n'apparaît que dans la répartition
const SUIVI = ['A_PLANIFIER', 'PLANIFIEE', 'EN_COURS', 'TERMINEE']
const REPARTITION = [...SUIVI, 'ANNULEE']

const estAujourdHui = (date) => new Date(date).toDateString() === new Date().toDateString()

function debutDuJour() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function Tuile({ icone, libelle, valeur, lien }) {
  const contenu = (
    <>
      <span className="tuile__libelle">
        <Icone nom={icone} /> {libelle}
      </span>
      <strong className="tuile__valeur">{valeur}</strong>
    </>
  )
  return lien ? (
    <Link to={lien} className="tuile tuile--lien">
      {contenu}
    </Link>
  ) : (
    <div className="tuile">{contenu}</div>
  )
}

function ProchainsRendezVous({ prochains }) {
  return (
    <Card
      className="accueil__carte"
      title="Prochains rendez-vous"
      action={
        <span className="accueil__puce">
          <Icone nom="PLANIFIEE" /> À partir d'aujourd'hui
        </span>
      }
    >
      <div className="accueil__scroll">
        <table className="accueil__table">
          <thead>
            <tr>
              <th>Heure</th>
              <th>Intervention</th>
              <th>Statut</th>
              <th>Client</th>
              <th>Technicien</th>
              <th>Réf.</th>
            </tr>
          </thead>
          <tbody>
            {prochains.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  Aucun rendez-vous planifié.
                </td>
              </tr>
            ) : (
              prochains.map((i) => {
                const statut = getStatut(i.statut)
                return (
                  <tr key={i.id}>
                    <td className="accueil__heure">
                      <strong>{heure.format(new Date(i.datePrevue))}</strong>
                      {!estAujourdHui(i.datePrevue) && <span className="muted">{jourCourt.format(new Date(i.datePrevue))}</span>}
                    </td>
                    <td>
                      <Link to={`/dashboard/interventions/${i.id}`} className="accueil__objet">
                        {i.objet}
                      </Link>
                      {i.adresse && <span className="accueil__sous muted">{i.adresse}</span>}
                    </td>
                    <td>
                      <span className="accueil__statut">
                        <Badge tone={statut.tone}>{statut.label}</Badge>
                      </span>
                    </td>
                    <td>{i.client.nom}</td>
                    <td className={i.technicien ? '' : 'muted'}>{i.technicien?.nom ?? 'Non attribuée'}</td>
                    <td>
                      <Link to={`/dashboard/interventions/${i.id}`} className="accueil__ref">
                        {i.reference}
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function RepartitionStatuts({ compteurs, total }) {
  return (
    <Card className="accueil__carte accueil__repartition" title="Statut des interventions">
      <ul className="repartition">
        {REPARTITION.map((valeur) => {
          const statut = getStatut(valeur)
          const nombre = compteurs[valeur] ?? 0
          const part = total ? Math.round((nombre / total) * 100) : 0
          return (
            <li key={valeur}>
              <Link to={`/dashboard/interventions?statut=${valeur}`} className="repartition__ligne">
                <Icone nom={valeur} />
                <span className="repartition__libelle">{statut.label}</span>
                <span className="repartition__nombre">{nombre}</span>
                <span className="repartition__part">{part}%</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  // Calculé une fois : la requête ne doit pas changer à chaque rendu
  const [depuis] = useState(debutDuJour)
  const { data, error, reload } = useFetch(`/dashboard?depuis=${encodeURIComponent(depuis)}`)

  const entete = (
    <header className="accueil__entete">
      <div>
        <h1 className="accueil__titre">Aujourd'hui</h1>
        <p className="muted">{aujourdHui.format(new Date())}</p>
      </div>
      {user?.role === 'RESPONSABLE' && (
        <Link to="/dashboard/interventions" state={{ nouvelle: true }} className="btn btn--primary btn--md">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nouvelle intervention
        </Link>
      )}
    </header>
  )

  if (!data) {
    return (
      <div className="accueil">
        {entete}
        {error ? (
          <div className="accueil__etat">
            <p>Impossible de charger le tableau de bord.</p>
            <p className="muted">{error}</p>
            <Button variant="secondary" size="sm" onClick={reload}>
              Réessayer
            </Button>
          </div>
        ) : (
          <p className="muted">Chargement…</p>
        )}
      </div>
    )
  }

  const { compteurs, total, prochains, facturation } = data

  return (
    <div className="accueil">
      {entete}

      <div className="accueil__corps">
        <div className="accueil__principal">
          <ProchainsRendezVous prochains={prochains} />

          <Card className="accueil__carte" title="Suivi de l'activité">
            <div className="tuiles tuiles--4">
              {SUIVI.map((valeur) => (
                <Tuile
                  key={valeur}
                  icone={valeur}
                  libelle={getStatut(valeur).label}
                  valeur={compteurs[valeur] ?? 0}
                  lien={`/dashboard/interventions?statut=${valeur}`}
                />
              ))}
            </div>
          </Card>

          {facturation && (
            <Card
              className="accueil__carte"
              title="Facturation"
              action={
                <Link to="/dashboard/facturation" className="accueil__lien muted">
                  {facturation.aEncaisser} facture{facturation.aEncaisser > 1 ? 's' : ''} à encaisser
                </Link>
              }
            >
              <div className="tuiles tuiles--3">
                <Tuile icone="facture" libelle="Facturé" valeur={formatMontant(facturation.facture)} />
                <Tuile icone="encaisse" libelle="Encaissé" valeur={formatMontant(facturation.encaisse)} />
                <Tuile icone="resteDu" libelle="Reste dû" valeur={formatMontant(facturation.resteDu)} lien="/dashboard/facturation" />
              </div>
            </Card>
          )}
        </div>

        <aside className="accueil__cote">
          <RepartitionStatuts compteurs={compteurs} total={total} />
        </aside>
      </div>
    </div>
  )
}

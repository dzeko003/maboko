import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { api } from '../../api/client.js'
import { Badge } from '../../components/ui/Badge.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Card } from '../../components/ui/Card.jsx'
import '../../components/ui/Filtres.css'
import { useAuth } from '../../context/AuthContext.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { formatJourHeure } from '../../utils/format.js'
import { PRIORITES, STATUTS, getStatut } from '../../utils/interventions.js'
import { FormulaireIntervention } from './FormulaireIntervention.jsx'
import './InterventionsPage.css'
import '../../components/ui/TableCartes.css'

const TAILLE_PAGE = 20

function cheminListe({ page, statut, q, du, au }) {
  const params = new URLSearchParams({ page, taille: TAILLE_PAGE })
  if (statut) params.set('statut', statut)
  if (q) params.set('q', q)
  // Bornes de la période dans le fuseau du navigateur ; « au » est inclus
  if (du) params.set('du', new Date(`${du}T00:00`).toISOString())
  if (au) {
    const fin = new Date(`${au}T00:00`)
    fin.setDate(fin.getDate() + 1)
    params.set('au', fin.toISOString())
  }
  return `/interventions?${params}`
}

function Pagination({ page, pages, total, taille, onChanger }) {
  if (total === 0) return null
  const debut = (page - 1) * taille + 1
  const fin = Math.min(page * taille, total)
  return (
    <nav className="pagination" aria-label="Pagination des interventions">
      <span className="muted">
        {debut}–{fin} sur {total}
      </span>
      {pages > 1 && (
        <span className="pagination__boutons">
          <Button variant="secondary" size="sm" onClick={() => onChanger(page - 1)} disabled={page <= 1}>
            Précédent
          </Button>
          <span className="pagination__page">
            Page {page} sur {pages}
          </span>
          <Button variant="secondary" size="sm" onClick={() => onChanger(page + 1)} disabled={page >= pages}>
            Suivant
          </Button>
        </span>
      )}
    </nav>
  )
}

// Confirmation dans la ligne, sans boîte de dialogue du navigateur
function SupprimerIntervention({ intervention, onSupprimee }) {
  const [confirmation, setConfirmation] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState(null)

  async function supprimer() {
    setEnvoi(true)
    setErreur(null)
    try {
      await api.del(`/interventions/${intervention.id}`)
      onSupprimee()
    } catch (err) {
      setErreur(err.message)
      setEnvoi(false)
      setConfirmation(false)
    }
  }

  if (confirmation) {
    return (
      <span className="interventions__confirmation">
        <Button variant="primary" size="sm" onClick={supprimer} disabled={envoi}>
          {envoi ? 'Suppression…' : 'Confirmer'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirmation(false)} disabled={envoi}>
          Annuler
        </Button>
      </span>
    )
  }

  return (
    <>
      <button
        type="button"
        className="interventions__action interventions__action--danger"
        onClick={() => setConfirmation(true)}
        aria-label={`Supprimer l'intervention ${intervention.reference}`}
        title="Supprimer"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
        </svg>
      </button>
      {erreur && <span className="interventions__erreur" role="alert">{erreur}</span>}
    </>
  )
}

export default function InterventionsPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const statutActif = searchParams.get('statut') ?? ''
  const du = searchParams.get('du') ?? ''
  const au = searchParams.get('au') ?? ''
  const q = searchParams.get('q') ?? ''
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const [recherche, setRecherche] = useState(q)
  const location = useLocation()
  // null : fermé ; 'nouvelle' : création ; sinon id de l'intervention modifiée.
  // Le bouton du tableau de bord ouvre directement le formulaire
  const [formulaire, setFormulaire] = useState(() =>
    location.state?.nouvelle && user?.role === 'RESPONSABLE' ? 'nouvelle' : null,
  )

  const { data, loading, error, reload } = useFetch(cheminListe({ page, statut: statutActif, q, du, au }))
  const visibles = data?.interventions ?? []
  const compteurs = data?.compteurs ?? {}
  const totalGlobal = Object.values(compteurs).reduce((somme, n) => somme + n, 0)

  // Tout changement de filtre ramène à la page 1
  function majFiltres(changements) {
    setSearchParams(
      (params) => {
        const suivants = new URLSearchParams(params)
        Object.entries(changements).forEach(([cle, valeur]) => (valeur ? suivants.set(cle, valeur) : suivants.delete(cle)))
        if (!('page' in changements)) suivants.delete('page')
        return suivants
      },
      { replace: true },
    )
  }

  useEffect(() => {
    const terme = recherche.trim()
    if (terme === q) return
    const minuteur = setTimeout(() => majFiltres({ q: terme }), 300)
    return () => clearTimeout(minuteur)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recherche, q])

  function ouvrirFormulaire(id) {
    setFormulaire(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function choisirStatut(value) {
    majFiltres({ statut: value })
  }

  function changerPage(nouvelle) {
    majFiltres({ page: nouvelle > 1 ? String(nouvelle) : '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="interventions">
      <div className="interventions__entete">
        <header className="interventions__header">
          <div>
            <h1 className="interventions__title">Interventions</h1>
            <p className="muted">
              {loading && !data ? 'Chargement…' : `${totalGlobal} intervention${totalGlobal > 1 ? 's' : ''} au total`}
            </p>
          </div>
          {user?.role === 'RESPONSABLE' && (
            <Button onClick={() => ouvrirFormulaire('nouvelle')} disabled={formulaire === 'nouvelle'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Nouvelle intervention
            </Button>
          )}
        </header>

        <div className="interventions__barre">
          <div className="interventions__filtres" role="tablist" aria-label="Filtrer par statut">
            <button
              type="button"
              role="tab"
              aria-selected={!statutActif}
              className={`filtre ${!statutActif ? 'filtre--actif' : ''}`}
              onClick={() => choisirStatut('')}
            >
              Toutes <span className="filtre__compte">{totalGlobal}</span>
            </button>
            {STATUTS.map((s) => (
              <button
                key={s.value}
                type="button"
                role="tab"
                aria-selected={statutActif === s.value}
                className={`filtre ${statutActif === s.value ? 'filtre--actif' : ''}`}
                onClick={() => choisirStatut(s.value)}
              >
                {s.label} <span className="filtre__compte">{compteurs[s.value] ?? 0}</span>
              </button>
            ))}
          </div>
          <div className="interventions__outils">
            <div className="filtre-date">
              <span className="filtre-date__libelle">Du</span>
              <input type="date" value={du} max={au || undefined} onChange={(e) => majFiltres({ du: e.target.value })} aria-label="Prévues à partir du" />
              <span className="filtre-date__libelle">au</span>
              <input type="date" value={au} min={du || undefined} onChange={(e) => majFiltres({ au: e.target.value })} aria-label="Prévues jusqu'au" />
              {(du || au) && (
                <button type="button" className="filtre-date__effacer" onClick={() => majFiltres({ du: '', au: '' })} aria-label="Effacer la période">
                  ×
                </button>
              )}
            </div>
            <label className="recherche">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="search"
                placeholder="Objet, référence ou client…"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                aria-label="Rechercher une intervention"
              />
            </label>
          </div>
        </div>
      </div>

      {formulaire && (
        <FormulaireIntervention
          interventionId={formulaire === 'nouvelle' ? null : formulaire}
          onAnnuler={() => setFormulaire(null)}
          onEnregistree={() => {
            setFormulaire(null)
            reload()
          }}
        />
      )}

      <Card
        className="interventions__card"
        title={statutActif ? getStatut(statutActif).label : 'Toutes les interventions'}
      >
        {loading && !data ? (
          <p className="interventions__etat muted">Chargement des interventions…</p>
        ) : error ? (
          <div className="interventions__etat">
            <p>Impossible de charger les interventions.</p>
            <p className="muted">{error}</p>
            <Button variant="secondary" size="sm" onClick={reload}>
              Réessayer
            </Button>
          </div>
        ) : visibles.length === 0 ? (
          <p className="interventions__etat muted">
            {q || statutActif || du || au ? 'Aucune intervention ne correspond à ces critères.' : 'Aucune intervention pour le moment.'}
          </p>
        ) : (
          <div className="interventions__scroll">
            <table className="interventions__table table-cartes">
              <thead>
                <tr>
                  <th>Date prévue</th>
                  <th>Intervention</th>
                  <th>Statut</th>
                  <th>Priorité</th>
                  <th>Client</th>
                  <th>Technicien</th>
                  <th>Réf.</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {visibles.map((i) => {
                  const statut = getStatut(i.statut)
                  const priorite = PRIORITES[i.priorite] ?? PRIORITES.NORMALE
                  const date = i.datePrevue ? new Date(i.datePrevue) : null
                  return (
                    <tr key={i.id}>
                      <td data-label="Date prévue" className="interventions__date">
                        {date ? (
                          formatJourHeure(date)
                        ) : (
                          <span className="muted">Non planifiée</span>
                        )}
                      </td>
                      <td className="table-cartes__titre">
                        <Link to={`/dashboard/interventions/${i.id}`} className="interventions__objet">
                          {i.objet}
                        </Link>
                        {i.adresse && <span className="interventions__sous muted">{i.adresse}</span>}
                      </td>
                      <td data-label="Statut">
                        <span className="interventions__statut">
                          <Badge tone={statut.tone}>{statut.label}</Badge>
                        </span>
                      </td>
                      <td data-label="Priorité">
                        {priorite.tone === 'neutral' ? (
                          <span className="muted">{priorite.label}</span>
                        ) : (
                          <Badge tone={priorite.tone}>{priorite.label}</Badge>
                        )}
                      </td>
                      <td data-label="Client">{i.client?.nom ?? '—'}</td>
                      <td data-label="Technicien" className={i.technicien ? '' : 'muted'}>{i.technicien?.nom ?? 'Non attribuée'}</td>
                      <td data-label="Réf.">
                        <Link to={`/dashboard/interventions/${i.id}`} className="interventions__ref">
                          {i.reference}
                        </Link>
                      </td>
                      <td className="interventions__actions table-cartes__actions">
                        <Link
                          to={`/dashboard/interventions/${i.id}`}
                          className="interventions__action"
                          aria-label={`Voir l'intervention ${i.reference}`}
                          title="Voir"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </Link>
                        <button
                          type="button"
                          className="interventions__action"
                          onClick={() => ouvrirFormulaire(i.id)}
                          aria-label={`Modifier l'intervention ${i.reference}`}
                          title="Modifier"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                        </button>
                        {user?.role === 'RESPONSABLE' && (
                          <SupprimerIntervention
                            intervention={i}
                            onSupprimee={() => {
                              if (formulaire === i.id) setFormulaire(null)
                              reload()
                            }}
                          />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {data && (
          <Pagination page={data.page} pages={data.pages} total={data.total} taille={data.taille} onChanger={changerPage} />
        )}
      </Card>
    </div>
  )
}

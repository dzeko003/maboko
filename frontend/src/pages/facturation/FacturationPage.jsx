import { Fragment, useEffect, useId, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../api/client.js'
import { Badge } from '../../components/ui/Badge.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Card } from '../../components/ui/Card.jsx'
import '../../components/ui/Filtres.css'
import { useAuth } from '../../context/AuthContext.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { formatDate, formatMontant } from '../../utils/format.js'
import './FacturationPage.css'

const STATUTS = [
  { value: 'NON_PAYEE', label: 'Non payée', tone: 'err' },
  { value: 'PARTIELLE', label: 'Partiellement payée', tone: 'warn' },
  { value: 'PAYEE', label: 'Payée', tone: 'ok' },
]

const getStatut = (value) => STATUTS.find((s) => s.value === value) ?? STATUTS[0]

const MODES = {
  ESPECES: 'Espèces',
  MOBILE_MONEY: 'Mobile Money',
  VIREMENT: 'Virement',
  CHEQUE: 'Chèque',
  CARTE: 'Carte',
  AUTRE: 'Autre',
}

const ICONES = {
  facture: <path d="M6 2h9l5 5v15H6ZM14 2v6h6M9 13h6M9 17h6" />,
  valide: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  portefeuille: (
    <>
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M3 10h18M16 15h2" />
    </>
  ),
  oeil: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
}

function Icone({ nom, taille = 16 }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONES[nom]}
    </svg>
  )
}

const aujourdHui = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Requête de la liste : recherche et période sont filtrées par le serveur
function cheminListe({ q, du, au }) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  // Bornes de la période dans le fuseau du navigateur ; « au » est inclus
  if (du) params.set('du', new Date(`${du}T00:00`).toISOString())
  if (au) {
    const fin = new Date(`${au}T00:00`)
    fin.setDate(fin.getDate() + 1)
    params.set('au', fin.toISOString())
  }
  return `/facturation/factures?${params}`
}

const lienRecu = (paiementId) => `/api/facturation/paiements/${paiementId}/recu`

function Paiements({ facture, onEnregistre }) {
  const [form, setForm] = useState({ montant: String(facture.resteDu), date: aujourdHui(), mode: 'ESPECES', reference: '' })
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState(null)
  const id = useId()

  const changer = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.value }))

  async function enregistrer(e) {
    e.preventDefault()
    setEnvoi(true)
    setErreur(null)
    try {
      const paiement = await api.post(`/facturation/factures/${facture.id}/paiements`, form)
      setForm((f) => ({ ...f, montant: '', reference: '' }))
      onEnregistre({ ...paiement, facture: facture.reference })
    } catch (err) {
      setErreur(err.data?.details?.[0]?.message ?? err.message)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <div className="paiements">
      {facture.paiements.length > 0 && (
        <ul className="paiements__liste">
          {facture.paiements.map((p) => (
            <li key={p.id}>
              <span>{formatDate(p.date)}</span>
              <span className="paiements__numero">{p.numeroRecu}</span>
              <span className="muted">
                {MODES[p.mode] ?? p.mode}
                {p.reference && ` · ${p.reference}`}
              </span>
              <strong>{formatMontant(p.montant)}</strong>
              <a href={lienRecu(p.id)} target="_blank" rel="noreferrer" className="btn btn--secondary btn--sm">
                Reçu
              </a>
            </li>
          ))}
        </ul>
      )}
      {facture.resteDu > 0 && (
        <form className="paiements__form" onSubmit={enregistrer}>
          <div className="field">
            <label className="field__label" htmlFor={`${id}-montant`}>
              Montant
            </label>
            <input
              id={`${id}-montant`}
              className="field__control"
              type="number"
              min="1"
              step="any"
              max={facture.resteDu}
              placeholder={`Reste : ${facture.resteDu}`}
              value={form.montant}
              onChange={changer('montant')}
              required
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor={`${id}-date`}>
              Date
            </label>
            <input id={`${id}-date`} className="field__control" type="date" value={form.date} onChange={changer('date')} required />
          </div>
          <div className="field">
            <label className="field__label" htmlFor={`${id}-mode`}>
              Mode
            </label>
            <select id={`${id}-mode`} className="field__control" value={form.mode} onChange={changer('mode')}>
              {Object.entries(MODES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field__label" htmlFor={`${id}-reference`}>
              Référence (optionnel)
            </label>
            <input
              id={`${id}-reference`}
              className="field__control"
              placeholder="N° de transaction…"
              value={form.reference}
              onChange={changer('reference')}
            />
          </div>
          <Button type="submit" disabled={envoi}>
            {envoi ? 'Enregistrement…' : 'Enregistrer le paiement'}
          </Button>
          {erreur && <p className="field__error paiements__erreur">{erreur}</p>}
        </form>
      )}
    </div>
  )
}

function TableFactures({ factures, factureOuverte, onOuvrirFacture, onPaiement }) {
  return (
    <div className="factures__scroll">
      <table className="factures__table">
        <thead>
          <tr>
            <th>Émise le</th>
            <th>Intervention</th>
            <th>Statut</th>
            <th>Client</th>
            <th className="factures__nombre">Total</th>
            <th className="factures__nombre">Reste dû</th>
            <th>Réf.</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {factures.map((f) => {
            const statut = getStatut(f.statut)
            const deplie = factureOuverte === f.id
            const pdf = `/api/interventions/${f.intervention.id}/factures/${f.id}/pdf`
            return (
              <Fragment key={f.id}>
                <tr className={deplie ? 'factures__ligne--ouverte' : ''}>
                  <td className="factures__date">{formatDate(f.dateEmission)}</td>
                  <td>
                    <Link to={`/dashboard/interventions/${f.intervention.id}`} className="factures__intervention">
                      {f.intervention.objet}
                    </Link>
                    <span className="factures__sous muted">{f.intervention.reference}</span>
                  </td>
                  <td>
                    <span className="factures__statut">
                      <Badge tone={statut.tone}>{statut.label}</Badge>
                    </span>
                  </td>
                  <td>{f.intervention.client.nom}</td>
                  <td className="factures__nombre">{formatMontant(f.total)}</td>
                  <td className={`factures__nombre ${f.resteDu > 0 ? '' : 'muted'}`}>
                    {f.resteDu > 0 ? <strong>{formatMontant(f.resteDu)}</strong> : formatMontant(0)}
                  </td>
                  <td>
                    <a href={pdf} target="_blank" rel="noreferrer" className="factures__ref">
                      {f.reference}
                    </a>
                  </td>
                  <td className="factures__actions">
                    <a href={pdf} target="_blank" rel="noreferrer" className="factures__action" aria-label={`Voir la facture ${f.reference}`} title="Voir">
                      <Icone nom="oeil" />
                    </a>
                    <button
                      type="button"
                      className={`factures__action ${deplie ? 'factures__action--actif' : ''}`}
                      onClick={() => onOuvrirFacture(deplie ? null : f.id)}
                      aria-expanded={deplie}
                      aria-label={`${f.resteDu > 0 ? 'Encaisser' : 'Paiements de'} la facture ${f.reference}${f.paiements.length ? `, ${f.paiements.length} reçu${f.paiements.length > 1 ? 's' : ''}` : ''}`}
                      title={f.paiements.length ? `${f.resteDu > 0 ? 'Encaisser · ' : ''}${f.paiements.length} reçu${f.paiements.length > 1 ? 's' : ''}` : 'Encaisser'}
                    >
                      <Icone nom="portefeuille" />
                      {f.paiements.length > 0 && <span className="factures__nb-recus">{f.paiements.length}</span>}
                    </button>
                    <a href={pdf} download={`${f.reference}.pdf`} className="factures__action" aria-label={`Télécharger le PDF de ${f.reference}`} title="Télécharger le PDF">
                      <Icone nom="facture" />
                    </a>
                  </td>
                </tr>
                {deplie && (
                  <tr className="factures__detail">
                    <td colSpan={8}>
                      <Paiements
                        facture={f}
                        onEnregistre={onPaiement}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Factures() {
  const [searchParams, setSearchParams] = useSearchParams()
  const statutActif = searchParams.get('statut') ?? ''
  const q = searchParams.get('q') ?? ''
  const du = searchParams.get('du') ?? ''
  const au = searchParams.get('au') ?? ''
  const [recherche, setRecherche] = useState(q)
  const [factureOuverte, setFactureOuverte] = useState(null)
  // Dernier paiement enregistré : son reçu reste proposé même si la facture quitte le filtre actif
  const [dernierPaiement, setDernierPaiement] = useState(null)

  const { data, loading, error, reload } = useFetch(cheminListe({ q, du, au }))
  const factures = data?.factures ?? []
  const compteurs = data?.compteurs ?? {}
  const totaux = data?.totaux ?? { facture: 0, encaisse: 0, resteDu: 0 }

  // Met à jour les filtres dans l'URL (lien partageable, retour arrière du navigateur)
  function majFiltres(changements) {
    setSearchParams(
      (params) => {
        const suivants = new URLSearchParams(params)
        Object.entries(changements).forEach(([cle, valeur]) => (valeur ? suivants.set(cle, valeur) : suivants.delete(cle)))
        return suivants
      },
      { replace: true },
    )
  }

  // La recherche part au serveur 300 ms après la dernière frappe
  useEffect(() => {
    const terme = recherche.trim()
    if (terme === q) return
    const minuteur = setTimeout(() => majFiltres({ q: terme }), 300)
    return () => clearTimeout(minuteur)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recherche, q])

  const visibles = statutActif ? factures.filter((f) => f.statut === statutActif) : factures
  const filtre = q || du || au

  return (
    <div className="factures">
      <div className="factures__entete">
        <header>
          <h1 className="factures__titre">Factures</h1>
          <p className="muted">
            {loading && !data ? 'Chargement…' : `${factures.length} facture${factures.length > 1 ? 's' : ''}${filtre ? ' pour ces critères' : ''}`}
          </p>
        </header>

        <div className="factures__barre">
          <div className="factures__filtres" role="tablist" aria-label="Filtrer par statut de paiement">
            <button type="button" role="tab" aria-selected={!statutActif} className={`filtre ${!statutActif ? 'filtre--actif' : ''}`} onClick={() => majFiltres({ statut: '' })}>
              Toutes <span className="filtre__compte">{factures.length}</span>
            </button>
            {STATUTS.map((s) => (
              <button
                key={s.value}
                type="button"
                role="tab"
                aria-selected={statutActif === s.value}
                className={`filtre ${statutActif === s.value ? 'filtre--actif' : ''}`}
                onClick={() => majFiltres({ statut: s.value })}
              >
                {s.label} <span className="filtre__compte">{compteurs[s.value] ?? 0}</span>
              </button>
            ))}
          </div>

          <div className="factures__outils">
            <div className="filtre-date">
              <span className="filtre-date__libelle">Du</span>
              <input type="date" value={du} max={au || undefined} onChange={(e) => majFiltres({ du: e.target.value })} aria-label="Émises à partir du" />
              <span className="filtre-date__libelle">au</span>
              <input type="date" value={au} min={du || undefined} onChange={(e) => majFiltres({ au: e.target.value })} aria-label="Émises jusqu'au" />
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
                placeholder="Facture, client ou intervention…"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                aria-label="Rechercher une facture"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="factures__totaux">
        <div className="total">
          <span className="total__libelle">
            <Icone nom="facture" /> Facturé
          </span>
          <strong className="total__valeur">{formatMontant(totaux.facture)}</strong>
        </div>
        <div className="total">
          <span className="total__libelle">
            <Icone nom="valide" /> Encaissé
          </span>
          <strong className="total__valeur">{formatMontant(totaux.encaisse)}</strong>
        </div>
        <div className="total">
          <span className="total__libelle">
            <Icone nom="portefeuille" /> Reste dû
          </span>
          <strong className="total__valeur">{formatMontant(totaux.resteDu)}</strong>
        </div>
      </div>

      {dernierPaiement && (
        <div className="paiements__succes" role="status">
          <span>
            Paiement enregistré sur {dernierPaiement.facture}. Reçu <strong>{dernierPaiement.numeroRecu}</strong> prêt à
            remettre au client.
          </span>
          <span className="paiements__succes-actions">
            <a href={lienRecu(dernierPaiement.id)} target="_blank" rel="noreferrer" className="btn btn--primary btn--sm">
              Imprimer le reçu
            </a>
            <button type="button" className="filtre-date__effacer" onClick={() => setDernierPaiement(null)} aria-label="Fermer">
              ×
            </button>
          </span>
        </div>
      )}

      <Card className="factures__card" title={statutActif ? `Factures — ${getStatut(statutActif).label.toLowerCase()}` : 'Toutes les factures'}>
        {loading && !data ? (
          <p className="factures__etat muted">Chargement des factures…</p>
        ) : error ? (
          <div className="factures__etat">
            <p>Impossible de charger les factures.</p>
            <p className="muted">{error}</p>
            <Button variant="secondary" size="sm" onClick={reload}>
              Réessayer
            </Button>
          </div>
        ) : visibles.length === 0 ? (
          <p className="factures__etat muted">
            {filtre || statutActif ? 'Aucune facture ne correspond à ces critères.' : 'Aucune facture pour le moment.'}
          </p>
        ) : (
          <TableFactures
            factures={visibles}
            factureOuverte={factureOuverte}
            onOuvrirFacture={setFactureOuverte}
            onPaiement={(paiement) => {
              setDernierPaiement(paiement)
              reload()
            }}
          />
        )}
      </Card>
    </div>
  )
}

export default function FacturationPage() {
  const { user } = useAuth()
  if (user?.role !== 'RESPONSABLE') {
    return (
      <div className="factures">
        <h1 className="factures__titre">Factures</h1>
        <p className="muted">La facturation est réservée au responsable de l'activité.</p>
      </div>
    )
  }
  return <Factures />
}

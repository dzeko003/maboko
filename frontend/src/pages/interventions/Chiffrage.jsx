import { useId, useState } from 'react'
import { api } from '../../api/client.js'
import { Badge } from '../../components/ui/Badge.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Card } from '../../components/ui/Card.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { formatDate, formatMontant } from '../../utils/format.js'
import { LignesFormulaire } from './LignesFormulaire.jsx'
import { lignesPourApi, nouvelleLigne } from './lignes.js'

const ETATS_DEVIS = {
  BROUILLON: { label: 'Brouillon', tone: 'neutral' },
  ENVOYE: { label: 'Envoyé', tone: 'info' },
  ACCEPTE: { label: 'Accepté', tone: 'ok' },
  REFUSE: { label: 'Refusé', tone: 'err' },
}

const messageErreur = (err) => err.data?.details?.[0]?.message ?? err.message

// Le PDF est produit par l'API ; il s'ouvre dans un nouvel onglet (aperçu, impression, téléchargement)
export function LienPdf({ href, children = 'PDF' }) {
  return (
    <a href={`/api${href}`} target="_blank" rel="noreferrer" className="btn btn--secondary btn--sm">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6M9 13h6M9 17h6" />
      </svg>
      {children}
    </a>
  )
}

// Formulaire commun : lignes, champs complémentaires, bouton d'envoi
function FormulaireLignes({ titre, libelle, avecNotes, onEnvoyer, onAnnuler }) {
  const [lignes, setLignes] = useState(() => [nouvelleLigne()])
  const [notes, setNotes] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState(null)
  const idNotes = useId()

  async function soumettre(e) {
    e.preventDefault()
    setEnvoi(true)
    setErreur(null)
    try {
      await onEnvoyer({ lignes: lignesPourApi(lignes), ...(avecNotes && { notes }) })
    } catch (err) {
      setErreur(messageErreur(err))
      setEnvoi(false)
    }
  }

  return (
    <form className="chiffrage__formulaire" onSubmit={soumettre}>
      {titre && <p className="chiffrage__titre">{titre}</p>}
      <LignesFormulaire lignes={lignes} onChange={setLignes} />
      {avecNotes && (
        <div className="field">
          <label className="field__label" htmlFor={idNotes}>
            Notes (conditions, délais…)
          </label>
          <textarea
            id={idNotes}
            className="field__control detail__zone"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      )}
      {erreur && <p className="field__error">{erreur}</p>}
      <div className="chiffrage__actions">
        <Button type="submit" disabled={envoi}>
          {envoi ? 'Enregistrement…' : libelle}
        </Button>
        <Button variant="ghost" onClick={onAnnuler} disabled={envoi}>
          Annuler
        </Button>
      </div>
    </form>
  )
}

function LigneDevis({ intervention, devis, onChange }) {
  const { user } = useAuth()
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState(null)
  const etat = ETATS_DEVIS[devis.etat] ?? ETATS_DEVIS.BROUILLON
  const base = `/interventions/${intervention.id}/devis/${devis.id}`
  const facture = intervention.factures.some((f) => f.devisId === devis.id)

  async function agir(action) {
    setEnvoi(true)
    setErreur(null)
    try {
      await action()
      onChange()
    } catch (err) {
      setErreur(messageErreur(err))
      setEnvoi(false)
    }
  }

  const etatSuivant = (nouveau) => () => agir(() => api.patch(`${base}/etat`, { etat: nouveau }))

  return (
    <li className="chiffrage__element">
      <span className="detail__ref">{devis.reference}</span>
      <Badge tone={etat.tone}>{etat.label}</Badge>
      <span className="muted">{formatDate(devis.createdAt)}</span>
      <strong className="chiffrage__montant">{formatMontant(devis.total)}</strong>
      <span className="chiffrage__boutons">
        {devis.etat === 'BROUILLON' && (
          <>
            <Button variant="secondary" size="sm" onClick={etatSuivant('ENVOYE')} disabled={envoi}>
              Marquer envoyé
            </Button>
            <Button variant="ghost" size="sm" onClick={() => agir(() => api.del(base))} disabled={envoi}>
              Supprimer
            </Button>
          </>
        )}
        {devis.etat === 'ENVOYE' && (
          <>
            <Button variant="secondary" size="sm" onClick={etatSuivant('ACCEPTE')} disabled={envoi}>
              Accepté
            </Button>
            <Button variant="ghost" size="sm" onClick={etatSuivant('REFUSE')} disabled={envoi}>
              Refusé
            </Button>
          </>
        )}
        {devis.etat === 'ACCEPTE' && !facture && user?.role === 'RESPONSABLE' && (
          <Button
            size="sm"
            onClick={() => agir(() => api.post(`/interventions/${intervention.id}/factures`, { devisId: devis.id }))}
            disabled={envoi}
          >
            Facturer
          </Button>
        )}
        <LienPdf href={`${base}/pdf`} />
      </span>
      {erreur && <p className="field__error chiffrage__erreur">{erreur}</p>}
    </li>
  )
}

export function DevisSection({ intervention, onChange }) {
  const [ouvert, setOuvert] = useState(false)

  return (
    <Card
      title="Devis"
      className="detail__carte"
      action={
        !ouvert && (
          <Button variant="secondary" size="sm" onClick={() => setOuvert(true)}>
            + Devis
          </Button>
        )
      }
    >
      {ouvert && (
        <FormulaireLignes
          libelle="Enregistrer le brouillon"
          avecNotes
          onAnnuler={() => setOuvert(false)}
          onEnvoyer={async (donnees) => {
            await api.post(`/interventions/${intervention.id}/devis`, donnees)
            setOuvert(false)
            onChange()
          }}
        />
      )}
      {intervention.devis.length === 0
        ? !ouvert && <p className="muted">Aucun devis pour cette intervention.</p>
        : (
          <ul className="chiffrage__liste">
            {intervention.devis.map((d) => (
              <LigneDevis key={d.id} intervention={intervention} devis={d} onChange={onChange} />
            ))}
          </ul>
        )}
    </Card>
  )
}

export function FacturesSection({ intervention, onChange }) {
  const { user } = useAuth()
  const [ouvert, setOuvert] = useState(false)
  const travauxValides = Boolean(intervention.rapport?.valideLe)
  const peutFacturer = user?.role === 'RESPONSABLE' && travauxValides

  return (
    <Card
      title="Factures"
      className="detail__carte"
      action={
        peutFacturer &&
        !ouvert && (
          <Button variant="secondary" size="sm" onClick={() => setOuvert(true)}>
            + Facture
          </Button>
        )
      }
    >
      {ouvert && (
        <FormulaireLignes
          titre="Facture sur travaux validés"
          libelle="Créer la facture"
          onAnnuler={() => setOuvert(false)}
          onEnvoyer={async (donnees) => {
            await api.post(`/interventions/${intervention.id}/factures`, donnees)
            setOuvert(false)
            onChange()
          }}
        />
      )}
      {intervention.factures.length === 0
        ? !ouvert && (
            <p className="muted">Facturez un devis accepté, ou validez les travaux pour facturer sans devis.</p>
          )
        : (
          <ul className="chiffrage__liste">
            {intervention.factures.map((f) => (
              <li key={f.id} className="chiffrage__element">
                <span className="detail__ref">{f.reference}</span>
                <span className="muted">Émise le {formatDate(f.dateEmission)}</span>
                <strong className="chiffrage__montant">{formatMontant(f.total)}</strong>
                <span className="chiffrage__boutons">
                  <LienPdf href={`/interventions/${intervention.id}/factures/${f.id}/pdf`} />
                </span>
              </li>
            ))}
          </ul>
        )}
    </Card>
  )
}

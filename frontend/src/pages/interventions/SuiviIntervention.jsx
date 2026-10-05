import { useId, useRef, useState } from 'react'
import { api } from '../../api/client.js'
import { Button } from '../../components/ui/Button.jsx'
import { Card } from '../../components/ui/Card.jsx'
import { LienPdf } from './Chiffrage.jsx'
import { formatDateHeure } from '../../utils/format.js'

function Zone({ label, value, onChange }) {
  const id = useId()
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <textarea id={id} className="field__control detail__zone" rows={3} value={value} onChange={onChange} />
    </div>
  )
}

function BoutonEnregistrer({ enregistrer, etat }) {
  return (
    <div className="detail__enregistrer">
      <Button variant="secondary" size="sm" onClick={enregistrer} disabled={etat.envoi}>
        {etat.envoi ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
      {etat.message && <span className="muted">{etat.message}</span>}
      {etat.erreur && <span className="field__error">{etat.erreur}</span>}
    </div>
  )
}

function PiecesJointes({ intervention, categorie, titre, bouton, accept, onChange }) {
  const entree = useRef(null)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState(null)
  const pieces = intervention.piecesJointes.filter((p) => p.categorie === categorie)

  async function envoyer(e) {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier) return
    const donnees = new FormData()
    donnees.append('fichier', fichier)
    setEnvoi(true)
    setErreur(null)
    try {
      await api.post(`/interventions/${intervention.id}/pieces?categorie=${categorie}`, donnees)
      onChange()
    } catch (err) {
      setErreur(err.message)
    } finally {
      setEnvoi(false)
    }
  }

  async function supprimer(piece) {
    setErreur(null)
    try {
      await api.del(`/interventions/${intervention.id}/pieces/${piece.id}`)
      onChange()
    } catch (err) {
      setErreur(err.message)
    }
  }

  return (
    <div className="pieces">
      <div className="pieces__entete">
        <span>
          {titre} <span className="muted">({pieces.length})</span>
        </span>
        <input ref={entree} type="file" accept={accept} hidden onChange={envoyer} />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => entree.current?.click()}
          disabled={envoi}
        >
          {envoi ? 'Envoi…' : `+ ${bouton}`}
        </Button>
      </div>
      {erreur && <p className="field__error">{erreur}</p>}
      {pieces.length > 0 && (
        <ul className="pieces__liste">
          {pieces.map((p) => (
            <li key={p.id} className="pieces__element">
              <a href={p.url} target="_blank" rel="noreferrer" className="pieces__lien">
                {p.typeMime.startsWith('image/') ? (
                  <img src={p.url} alt={p.nomOriginal} className="pieces__vignette" />
                ) : (
                  <span className="pieces__fichier">{p.nomOriginal}</span>
                )}
              </a>
              <button
                type="button"
                className="pieces__supprimer"
                onClick={() => supprimer(p)}
                aria-label={`Supprimer ${p.nomOriginal}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function Diagnostic({ intervention, rapport, onChange }) {
  return (
    <Card title="Diagnostic" className="detail__carte">
      <div className="detail__grille-2">
        <Zone label="Constats" value={rapport.rapport.constats} onChange={rapport.changer('constats')} />
        <Zone label="Cause présumée" value={rapport.rapport.causePresumee} onChange={rapport.changer('causePresumee')} />
        <Zone
          label="Travaux recommandés"
          value={rapport.rapport.travauxRecommandes}
          onChange={rapport.changer('travauxRecommandes')}
        />
      </div>
      <BoutonEnregistrer enregistrer={rapport.enregistrer} etat={rapport.etat} />
      <PiecesJointes
        intervention={intervention}
        categorie="AVANT"
        titre="Photos avant travaux"
        bouton="Photo"
        accept="image/jpeg,image/png,image/webp"
        onChange={onChange}
      />
      <PiecesJointes
        intervention={intervention}
        categorie="DOCUMENT"
        titre="Documents"
        bouton="Document"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={onChange}
      />
    </Card>
  )
}

function Validation({ intervention, onChange }) {
  const [nom, setNom] = useState(intervention.client.nom)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState(null)
  const id = useId()
  const { rapport } = intervention

  if (rapport?.valideLe) {
    return (
      <div className="validation">
        <p className="validation__titre">Validation des travaux</p>
        <p>
          Travaux validés par <strong>{rapport.valideParNom}</strong> le {formatDateHeure(rapport.valideLe)}.
        </p>
      </div>
    )
  }

  async function valider(e) {
    e.preventDefault()
    setEnvoi(true)
    setErreur(null)
    try {
      await api.post(`/interventions/${intervention.id}/validation`, { valideParNom: nom })
      onChange()
    } catch (err) {
      setErreur(err.data?.details?.[0]?.message ?? err.message)
      setEnvoi(false)
    }
  }

  return (
    <form className="validation" onSubmit={valider}>
      <p className="validation__titre">Validation des travaux</p>
      <label className="field__label" htmlFor={id}>
        Nom de la personne qui valide
      </label>
      <div className="validation__ligne">
        <input id={id} className="field__control" value={nom} onChange={(e) => setNom(e.target.value)} required />
        <Button type="submit" disabled={envoi || intervention.statut === 'ANNULEE'}>
          {envoi ? 'Validation…' : 'Valider les travaux'}
        </Button>
      </div>
      {erreur && <p className="field__error">{erreur}</p>}
      <p className="validation__aide muted">
        La date est enregistrée automatiquement et l'intervention passe à « Terminée ».
      </p>
    </form>
  )
}

export function TravauxRapport({ intervention, rapport, onChange }) {
  return (
    <Card title="Travaux et rapport" className="detail__carte">
      <div className="detail__grille-2">
        <Zone label="Avancement des travaux" value={rapport.rapport.avancement} onChange={rapport.changer('avancement')} />
        <Zone label="Travaux réalisés" value={rapport.rapport.travauxRealises} onChange={rapport.changer('travauxRealises')} />
        <Zone
          label="Matériaux réellement utilisés"
          value={rapport.rapport.materiauxUtilises}
          onChange={rapport.changer('materiauxUtilises')}
        />
        <Zone label="Observations finales" value={rapport.rapport.observations} onChange={rapport.changer('observations')} />
      </div>
      <BoutonEnregistrer enregistrer={rapport.enregistrer} etat={rapport.etat} />
      <PiecesJointes
        intervention={intervention}
        categorie="APRES"
        titre="Photos après travaux"
        bouton="Photo"
        accept="image/jpeg,image/png,image/webp"
        onChange={onChange}
      />
      <Validation intervention={intervention} onChange={onChange} />
      <div className="detail__rapport-pdf">
        <LienPdf href={`/interventions/${intervention.id}/rapport/pdf`}>Rapport PDF</LienPdf>
        <span className="muted">Le PDF reprend le rapport tel qu'il est enregistré.</span>
      </div>
    </Card>
  )
}

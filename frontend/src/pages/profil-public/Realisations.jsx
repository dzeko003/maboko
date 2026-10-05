import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { api } from '../../api/client.js'
import { Button } from '../../components/ui/Button.jsx'
import { Card } from '../../components/ui/Card.jsx'
import { Input } from '../../components/ui/Input.jsx'
import { useFetch } from '../../hooks/useFetch.js'

const MAX = 12

function ZoneTexte({ label, value, onChange }) {
  const id = useId()
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <textarea id={id} className="field__control profil__bio" rows={3} maxLength={500} value={value} onChange={onChange} />
    </div>
  )
}

// Ajout (photo obligatoire) ou modification du titre et de la description d'une réalisation
function FormulaireRealisation({ realisation, onEnregistre, onAnnuler }) {
  const entree = useRef(null)
  const [fichier, setFichier] = useState(null)
  const [titre, setTitre] = useState(realisation?.titre ?? '')
  const [description, setDescription] = useState(realisation?.description ?? '')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState(null)

  // Aperçu local de la photo choisie, libéré quand elle change ou que le formulaire se ferme
  const apercu = useMemo(() => (fichier ? URL.createObjectURL(fichier) : null), [fichier])
  useEffect(() => () => apercu && URL.revokeObjectURL(apercu), [apercu])

  async function soumettre(e) {
    e.preventDefault()
    if (!realisation && !fichier) {
      setErreur('Ajoutez une photo de la réalisation')
      return
    }
    setEnvoi(true)
    setErreur(null)
    try {
      if (realisation) {
        await api.put(`/profil-public/realisations/${realisation.id}`, { titre, description })
      } else {
        const donnees = new FormData()
        donnees.append('titre', titre)
        donnees.append('description', description)
        donnees.append('fichier', fichier)
        await api.post('/profil-public/realisations', donnees)
      }
      onEnregistre()
    } catch (err) {
      setErreur(err.data?.details?.[0]?.message ?? err.message)
      setEnvoi(false)
    }
  }

  const image = apercu ?? realisation?.photoUrl

  return (
    <form className="realisation-form" onSubmit={soumettre}>
      <div className="realisation-form__photo">
        {image ? <img src={image} alt="" /> : <span className="muted">Aucune photo</span>}
        {!realisation && (
          <>
            <input
              ref={entree}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
            />
            <Button variant="secondary" size="sm" onClick={() => entree.current?.click()}>
              {fichier ? 'Changer la photo' : '+ Choisir une photo'}
            </Button>
          </>
        )}
      </div>
      <div className="realisation-form__champs">
        <Input label="Titre" placeholder="Ex. Rénovation d'une salle de bain" value={titre} onChange={(e) => setTitre(e.target.value)} maxLength={120} required />
        <ZoneTexte label="Description (optionnel)" value={description} onChange={(e) => setDescription(e.target.value)} />
        {erreur && <p className="field__error">{erreur}</p>}
        <div className="realisation-form__actions">
          <Button type="submit" disabled={envoi}>
            {envoi ? 'Enregistrement…' : realisation ? 'Enregistrer' : 'Ajouter la réalisation'}
          </Button>
          <Button variant="ghost" onClick={onAnnuler} disabled={envoi}>
            Annuler
          </Button>
        </div>
      </div>
    </form>
  )
}

export function Realisations() {
  const { data, error, reload } = useFetch('/profil-public/realisations')
  // null : fermé ; 'nouvelle' : ajout ; sinon la réalisation modifiée
  const [formulaire, setFormulaire] = useState(null)
  const [suppression, setSuppression] = useState(null)
  const [erreur, setErreur] = useState(null)
  const realisations = data ?? []

  async function supprimer(realisation) {
    setSuppression(realisation.id)
    setErreur(null)
    try {
      await api.del(`/profil-public/realisations/${realisation.id}`)
      reload()
    } catch (err) {
      setErreur(err.message)
    } finally {
      setSuppression(null)
    }
  }

  return (
    <Card
      className="profil__carte"
      title={`Réalisations (${realisations.length}/${MAX})`}
      action={
        !formulaire &&
        realisations.length < MAX && (
          <Button variant="secondary" size="sm" onClick={() => setFormulaire('nouvelle')}>
            + Ajouter
          </Button>
        )
      }
    >
      <div className="realisations">
        {formulaire && (
          <FormulaireRealisation
            key={formulaire === 'nouvelle' ? 'nouvelle' : formulaire.id}
            realisation={formulaire === 'nouvelle' ? null : formulaire}
            onAnnuler={() => setFormulaire(null)}
            onEnregistre={() => {
              setFormulaire(null)
              reload()
            }}
          />
        )}
        {(error || erreur) && <p className="field__error">{error ?? erreur}</p>}
        {realisations.length === 0 && !formulaire ? (
          <p className="muted">
            Montrez vos chantiers terminés : une photo, un titre, quelques mots. Elles apparaissent sur votre page publique.
          </p>
        ) : (
          <ul className="realisations__grille">
            {realisations.map((r) => (
              <li key={r.id} className="realisation">
                {r.photoUrl ? <img src={r.photoUrl} alt={r.titre} className="realisation__image" /> : <span className="realisation__image" />}
                <div className="realisation__texte">
                  <strong>{r.titre}</strong>
                  {r.description && <p className="muted">{r.description}</p>}
                </div>
                <div className="realisation__actions">
                  <Button variant="ghost" size="sm" onClick={() => setFormulaire(r)} disabled={Boolean(formulaire)}>
                    Modifier
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => supprimer(r)} disabled={suppression === r.id}>
                    {suppression === r.id ? 'Suppression…' : 'Supprimer'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}

import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client.js'
import { Button } from '../../components/ui/Button.jsx'
import { Card } from '../../components/ui/Card.jsx'
import { Input } from '../../components/ui/Input.jsx'
import { Select } from '../../components/ui/Select.jsx'
import { Realisations } from './Realisations.jsx'
import './ProfilPublicPage.css'

// Liste fermée pour que l'annuaire filtre de façon fiable
const VILLES = [
  'Brazzaville',
  'Pointe-Noire',
  'Dolisie',
  'Nkayi',
  'Ouesso',
  'Owando',
  'Oyo',
  'Impfondo',
  'Madingou',
  'Sibiti',
  'Kinkala',
  'Djambala',
  'Ewo',
  'Gamboma',
  'Mossendjo',
]

const FORMULAIRE_VIDE = {
  metier: '',
  ville: '',
  quartier: '',
  telephone: '',
  whatsapp: '',
  bio: '',
  profilPublic: false,
}

function versFormulaire(profil) {
  return {
    metier: profil.metier ?? '',
    ville: profil.ville ?? '',
    quartier: profil.quartier ?? '',
    telephone: profil.telephone ?? '',
    whatsapp: profil.whatsapp ?? '',
    bio: profil.bio ?? '',
    profilPublic: Boolean(profil.profilPublic),
  }
}

function ouNull(valeur) {
  const texte = valeur.trim()
  return texte === '' ? null : texte
}

function versEnvoi(form) {
  return {
    metier: ouNull(form.metier),
    ville: ouNull(form.ville),
    quartier: ouNull(form.quartier),
    telephone: ouNull(form.telephone),
    whatsapp: ouNull(form.whatsapp),
    bio: ouNull(form.bio),
    profilPublic: form.profilPublic,
  }
}

const initiales = (nom = '') =>
  nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot[0].toUpperCase())
    .join('')

function Photo({ profil, onChange }) {
  const entree = useRef(null)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState(null)

  async function envoyer(e) {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier) return
    const donnees = new FormData()
    donnees.append('fichier', fichier)
    setEnvoi(true)
    setErreur(null)
    try {
      onChange(await api.post('/profil-public/photo', donnees))
    } catch (err) {
      setErreur(err.message)
    } finally {
      setEnvoi(false)
    }
  }

  async function retirer() {
    setEnvoi(true)
    setErreur(null)
    try {
      onChange(await api.del('/profil-public/photo'))
    } catch (err) {
      setErreur(err.message)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Card className="profil__carte" title="Photo">
      <div className="profil__photo">
        {profil.photoUrl ? (
          <img src={profil.photoUrl} alt="" className="profil__avatar profil__avatar--image" />
        ) : (
          <span className="profil__avatar" aria-hidden="true">
            {initiales(profil.nom)}
          </span>
        )}
        <input ref={entree} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={envoyer} />
        <div className="profil__photo-actions">
          <Button variant="secondary" size="sm" onClick={() => entree.current?.click()} disabled={envoi}>
            {envoi ? 'Envoi…' : profil.photoUrl ? 'Changer' : '+ Ajouter'}
          </Button>
          {profil.photoUrl && (
            <Button variant="ghost" size="sm" onClick={retirer} disabled={envoi}>
              Retirer
            </Button>
          )}
        </div>
      </div>
      {erreur && <p className="field__error">{erreur}</p>}
      <p className="profil__aide muted">JPEG, PNG ou WebP, 5 Mo maximum.</p>
    </Card>
  )
}

function MonLien({ profil }) {
  const [copie, setCopie] = useState(false)
  const visible = profil.profilPublic && profil.slug
  const url = visible ? `${window.location.origin}/t/${profil.slug}` : null

  async function copier() {
    try {
      await navigator.clipboard.writeText(url)
      setCopie(true)
      setTimeout(() => setCopie(false), 2000)
    } catch {
      // Presse-papiers indisponible : le lien reste sélectionnable
    }
  }

  return (
    <Card className="profil__carte" title="Mon lien">
      {visible ? (
        <div className="profil__lien">
          <code className="profil__url">{url}</code>
          <div className="profil__photo-actions">
            <Button variant="secondary" size="sm" onClick={copier}>
              {copie ? 'Copié' : 'Copier'}
            </Button>
            <Link to={`/t/${profil.slug}`} target="_blank" className="btn btn--ghost btn--sm">
              Voir ma page
            </Link>
          </div>
          <p className="profil__aide muted">Partagez-le sur WhatsApp ou vos cartes de visite.</p>
        </div>
      ) : (
        <p className="muted">Rendez votre profil visible pour obtenir votre lien.</p>
      )}
    </Card>
  )
}

export default function ProfilPublicPage() {
  const [profil, setProfil] = useState(null)
  const [form, setForm] = useState(FORMULAIRE_VIDE)
  const [erreurChargement, setErreurChargement] = useState(null)
  const [enCours, setEnCours] = useState(false)
  const [message, setMessage] = useState(null)
  const idBio = useId()

  useEffect(() => {
    let actif = true
    api
      .get('/profil-public')
      .then((p) => {
        if (!actif) return
        setProfil(p)
        setForm(versFormulaire(p))
      })
      .catch((e) => actif && setErreurChargement(e.message))
    return () => {
      actif = false
    }
  }, [])

  const changer = (champ) => (e) => setForm((courant) => ({ ...courant, [champ]: e.target.value }))

  async function enregistrer(e) {
    e.preventDefault()
    setEnCours(true)
    setMessage(null)
    try {
      const p = await api.patch('/profil-public', versEnvoi(form))
      setProfil(p)
      setForm(versFormulaire(p))
      setMessage({ type: 'ok', texte: p.profilPublic ? 'Profil enregistré et visible dans l’annuaire.' : 'Profil enregistré.' })
    } catch (err) {
      setMessage({ type: 'erreur', texte: err.data?.details?.[0]?.message ?? err.message })
    } finally {
      setEnCours(false)
    }
  }

  // Une ville saisie avant la liste reste proposée
  const villes = form.ville && !VILLES.includes(form.ville) ? [form.ville, ...VILLES] : VILLES

  return (
    <div className="profil">
      <header>
        <h1 className="profil__titre">Mon profil public</h1>
        <p className="muted">Ce que vos clients voient dans l’annuaire et sur votre page.</p>
      </header>

      {!profil ? (
        <p className={erreurChargement ? 'field__error' : 'muted'}>{erreurChargement ?? 'Chargement…'}</p>
      ) : (
        <div className="profil__corps">
          <div className="profil__principal">
            <Card className="profil__carte" title="Informations publiques">
              <form className="profil__formulaire" onSubmit={enregistrer}>
                <label className="profil__visibilite">
                  <input
                    type="checkbox"
                    checked={form.profilPublic}
                    onChange={(e) => setForm((courant) => ({ ...courant, profilPublic: e.target.checked }))}
                  />
                  <span>
                    <strong>Profil visible dans l’annuaire</strong>
                    <span className="muted">
                      Les clients peuvent vous trouver, vous contacter et voir vos avis. Métier, ville et un numéro sont requis.
                    </span>
                  </span>
                </label>

                <div className="profil__grille">
                  <Input label="Métier" placeholder="Ex. Plombier" value={form.metier} onChange={changer('metier')} maxLength={120} />
                  <Select label="Ville" value={form.ville} onChange={changer('ville')}>
                    <option value="">Choisir…</option>
                    {villes.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="Quartier / arrondissement"
                    placeholder="Ex. Moungali"
                    value={form.quartier}
                    onChange={changer('quartier')}
                    maxLength={100}
                  />
                  <Input
                    label="Téléphone"
                    type="tel"
                    placeholder="+242 06 000 00 00"
                    value={form.telephone}
                    onChange={changer('telephone')}
                    maxLength={40}
                  />
                  <Input
                    label="WhatsApp"
                    type="tel"
                    placeholder="+242 06 000 00 00"
                    value={form.whatsapp}
                    onChange={changer('whatsapp')}
                    maxLength={40}
                  />
                  <p className="profil__email muted">
                    Email affiché : <span>{profil.email}</span>
                  </p>
                </div>

                <div className="field">
                  <label className="field__label" htmlFor={idBio}>
                    Présentation
                  </label>
                  <textarea
                    id={idBio}
                    className="field__control profil__bio"
                    placeholder="Vos spécialités, votre expérience, vos zones d’intervention…"
                    value={form.bio}
                    onChange={changer('bio')}
                    maxLength={2000}
                    rows={4}
                  />
                </div>

                {message && (
                  <p className={`profil__message profil__message--${message.type}`} role={message.type === 'erreur' ? 'alert' : 'status'}>
                    {message.texte}
                  </p>
                )}

                <div>
                  <Button type="submit" disabled={enCours}>
                    {enCours ? 'Enregistrement…' : 'Enregistrer'}
                  </Button>
                </div>
              </form>
            </Card>

            <Realisations />
          </div>

          <aside className="profil__cote">
            <Photo profil={profil} onChange={setProfil} />
            <MonLien profil={profil} />
          </aside>
        </div>
      )}
    </div>
  )
}

import { useEffect, useId, useRef, useState } from 'react'
import { api } from '../../api/client.js'
import { Button } from '../../components/ui/Button.jsx'
import { Card } from '../../components/ui/Card.jsx'
import { Input } from '../../components/ui/Input.jsx'
import { Select } from '../../components/ui/Select.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { Equipe } from './Equipe.jsx'
import { MonCompte, MotDePasse } from './MonCompte.jsx'
import './ProfilActivitePage.css'

const DEVISES = { XAF: 'XAF', EUR: 'EUR', USD: 'USD' }

const versFormulaire = (a) => ({
  nom: a.nom ?? '',
  telephone: a.telephone ?? '',
  adresse: a.adresse ?? '',
  devise: a.devise ?? 'XAF',
  infosFacturation: a.infosFacturation ?? '',
})

function InformationsActivite({ activite, onChange }) {
  const [form, setForm] = useState(() => versFormulaire(activite))
  const [envoi, setEnvoi] = useState(false)
  const [retour, setRetour] = useState(null)
  const idInfos = useId()

  const changer = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.value }))

  async function soumettre(e) {
    e.preventDefault()
    setEnvoi(true)
    setRetour(null)
    try {
      onChange(await api.put('/activite', form))
      setRetour({ type: 'ok', texte: 'Informations enregistrées. Elles apparaissent sur vos prochains documents.' })
    } catch (err) {
      setRetour({ type: 'erreur', texte: err.data?.details?.[0]?.message ?? err.message })
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Card className="activite__carte" title="Activité">
      <form className="activite__form" onSubmit={soumettre}>
        <div className="activite__grille">
          <Input label="Nom de l'activité" value={form.nom} onChange={changer('nom')} required />
          <Input label="Téléphone" type="tel" value={form.telephone} onChange={changer('telephone')} />
          <Input label="Adresse" value={form.adresse} onChange={changer('adresse')} />
          <Select label="Devise" value={form.devise} onChange={changer('devise')}>
            {Object.entries(DEVISES).map(([valeur, libelle]) => (
              <option key={valeur} value={valeur}>
                {libelle}
              </option>
            ))}
          </Select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor={idInfos}>
            Informations de facturation
          </label>
          <textarea
            id={idInfos}
            className="field__control activite__zone"
            rows={3}
            placeholder="RCCM, NIU, coordonnées bancaires…"
            value={form.infosFacturation}
            onChange={changer('infosFacturation')}
          />
        </div>
        {retour && <p className={retour.type === 'erreur' ? 'field__error' : 'equipe__ok'}>{retour.texte}</p>}
        <div>
          <Button type="submit" disabled={envoi}>
            {envoi ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

// Logo affiché en en-tête des devis, factures, reçus et rapports PDF
function Logo({ activite, onChange }) {
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
      onChange(await api.post('/activite/logo', donnees))
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
      onChange(await api.del('/activite/logo'))
    } catch (err) {
      setErreur(err.message)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Card className="activite__carte" title="Logo">
      <div className="logo-activite">
        <div className="logo-activite__cadre">
          {activite.logoUrl ? <img src={activite.logoUrl} alt={`Logo de ${activite.nom}`} /> : <span className="muted">Aucun logo</span>}
        </div>
        <p className="muted logo-activite__aide">Affiché en en-tête des devis, factures et rapports. PNG ou JPEG, 2 Mo maximum.</p>
        {erreur && <p className="field__error">{erreur}</p>}
        <input ref={entree} type="file" accept="image/png,image/jpeg" hidden onChange={envoyer} />
        <div className="logo-activite__actions">
          <Button variant="secondary" size="sm" onClick={() => entree.current?.click()} disabled={envoi}>
            {envoi ? 'Envoi…' : activite.logoUrl ? 'Changer le logo' : '+ Ajouter un logo'}
          </Button>
          {activite.logoUrl && (
            <Button variant="ghost" size="sm" onClick={retirer} disabled={envoi}>
              Retirer
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

export default function ProfilActivitePage() {
  const { user } = useAuth()
  const responsable = user?.role === 'RESPONSABLE'
  const [activite, setActivite] = useState(null)
  const [erreur, setErreur] = useState(null)

  useEffect(() => {
    if (!responsable) return
    let actif = true
    api
      .get('/activite')
      .then((a) => actif && setActivite(a))
      .catch((e) => actif && setErreur(e.message))
    return () => {
      actif = false
    }
  }, [responsable])

  // Un technicien ne gère que son propre compte
  if (!responsable) {
    return (
      <div className="activite">
        <header>
          <h1 className="activite__titre">Mon compte</h1>
          <p className="muted">Vos informations de connexion.</p>
        </header>
        <div className="activite__technicien">
          <MonCompte />
          <MotDePasse />
        </div>
      </div>
    )
  }

  return (
    <div className="activite">
      <header>
        <h1 className="activite__titre">Profil de l'activité</h1>
        <p className="muted">Ces informations apparaissent sur vos devis, factures et rapports.</p>
      </header>

      {!activite ? (
        <p className={erreur ? 'field__error' : 'muted'}>{erreur ?? 'Chargement…'}</p>
      ) : (
        <div className="activite__corps">
          <InformationsActivite activite={activite} onChange={setActivite} />
          <aside className="activite__cote">
            <Logo activite={activite} onChange={setActivite} />
            <Equipe />
            <MonCompte />
            <MotDePasse />
          </aside>
        </div>
      )}
    </div>
  )
}

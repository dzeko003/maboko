import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import { Button } from '../../components/ui/Button.jsx'
import { Card } from '../../components/ui/Card.jsx'
import { Input } from '../../components/ui/Input.jsx'
import '../../components/ui/Filtres.css'
import { useFetch } from '../../hooks/useFetch.js'

function AjoutDepuisCarnet({ onEnregistre, onAnnuler }) {
  const [saisie, setSaisie] = useState('')
  const [q, setQ] = useState('')
  const [ajout, setAjout] = useState(null)
  const [erreur, setErreur] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setQ(saisie.trim()), 300)
    return () => clearTimeout(timer)
  }, [saisie])

  const { data: comptes, loading, error } = useFetch(`/clients/comptes${q ? `?q=${encodeURIComponent(q)}` : ''}`)

  async function ajouter(compte) {
    setAjout(compte.id)
    setErreur(null)
    try {
      onEnregistre(await api.post('/clients/depuis-compte', { compteClientId: compte.id }))
    } catch (err) {
      setErreur(err.message)
      setAjout(null)
    }
  }

  return (
    <div className="ajout-carnet">
      <Input
        label="Rechercher un client inscrit sur Carnet"
        type="search"
        placeholder="Nom, téléphone ou e-mail…"
        value={saisie}
        onChange={(e) => setSaisie(e.target.value)}
        autoFocus
      />
      {erreur && <p className="field__error">{erreur}</p>}
      {loading && !comptes ? (
        <p className="muted">Recherche…</p>
      ) : error ? (
        <p className="field__error">{error}</p>
      ) : comptes?.length === 0 ? (
        <p className="muted">
          {q ? 'Aucun compte Carnet ne correspond.' : 'Tous les clients inscrits sur Carnet font déjà partie de vos clients.'}
        </p>
      ) : (
        <ul className="ajout-carnet__liste">
          {comptes?.map((compte) => (
            <li key={compte.id}>
              <span>
                <strong>{compte.nom}</strong>
                <span className="muted">{[compte.telephone, compte.ville].filter(Boolean).join(' · ') || 'Coordonnées non renseignées'}</span>
              </span>
              <Button size="sm" variant="secondary" onClick={() => ajouter(compte)} disabled={ajout !== null}>
                {ajout === compte.id ? 'Ajout…' : 'Ajouter'}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div>
        <Button variant="ghost" onClick={onAnnuler}>
          Annuler
        </Button>
      </div>
    </div>
  )
}

export function AjoutClient({ onEnregistre, onAnnuler }) {
  const [mode, setMode] = useState('externe')
  return (
    <Card className="formulaire-client" title="Ajouter un client">
      <div className="ajout-client__modes" role="tablist" aria-label="Type de client à ajouter">
        <button type="button" role="tab" aria-selected={mode === 'externe'} className={`filtre ${mode === 'externe' ? 'filtre--actif' : ''}`} onClick={() => setMode('externe')}>
          Nouveau client externe
        </button>
        <button type="button" role="tab" aria-selected={mode === 'carnet'} className={`filtre ${mode === 'carnet' ? 'filtre--actif' : ''}`} onClick={() => setMode('carnet')}>
          Client inscrit sur Carnet
        </button>
      </div>
      {mode === 'externe' ? (
        <FormulaireClient integre onEnregistre={onEnregistre} onAnnuler={onAnnuler} />
      ) : (
        <AjoutDepuisCarnet onEnregistre={onEnregistre} onAnnuler={onAnnuler} />
      )}
    </Card>
  )
}

// client absent : création ; présent : modification
// integre : formulaire affiché dans une carte existante (sans sa propre carte)
export function FormulaireClient({ client, integre = false, onEnregistre, onAnnuler }) {
  const [form, setForm] = useState({
    nom: client?.nom ?? '',
    telephone: client?.telephone ?? '',
    adresse: client?.adresse ?? '',
    notes: client?.notes ?? '',
  })
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState(null)

  const changer = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.value }))

  async function soumettre(e) {
    e.preventDefault()
    setEnvoi(true)
    setErreur(null)
    try {
      const resultat = client ? await api.put(`/clients/${client.id}`, form) : await api.post('/clients', form)
      onEnregistre(resultat)
    } catch (err) {
      setErreur(err.data?.details?.[0]?.message ?? err.message)
      setEnvoi(false)
    }
  }

  const formulaire = (
    <form onSubmit={soumettre} className="formulaire-client__grille">
      <Input label="Nom" placeholder="Nom ou raison sociale" value={form.nom} onChange={changer('nom')} required />
      <Input label="Téléphone" type="tel" placeholder="+242 06 000 00 00" value={form.telephone} onChange={changer('telephone')} />
      <Input label="Adresse" placeholder="Rue, quartier, ville" value={form.adresse} onChange={changer('adresse')} />
      <Input
        label="Notes"
        placeholder="Accès, horaires, contact sur place…"
        className="formulaire-client__large"
        value={form.notes}
        onChange={changer('notes')}
      />
      {erreur && <p className="field__error formulaire-client__plein">{erreur}</p>}
      <div className="formulaire-client__actions">
        <Button type="submit" disabled={envoi}>
          {envoi ? 'Enregistrement…' : client ? 'Enregistrer' : 'Ajouter le client'}
        </Button>
        <Button variant="ghost" onClick={onAnnuler} disabled={envoi}>
          Annuler
        </Button>
      </div>
    </form>
  )

  if (integre) return formulaire
  return (
    <Card className="formulaire-client" title={client ? `Modifier ${client.nom}` : 'Nouveau client'}>
      {formulaire}
    </Card>
  )
}

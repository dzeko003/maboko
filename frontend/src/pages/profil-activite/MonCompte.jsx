import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client.js'
import { Button } from '../../components/ui/Button.jsx'
import { Card } from '../../components/ui/Card.jsx'
import { Input } from '../../components/ui/Input.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

const ROLES = { RESPONSABLE: 'Responsable', TECHNICIEN: 'Technicien' }

export function MonCompte() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function deconnecter() {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <Card className="activite__carte" title="Mon compte">
      <div className="compte">
        <p className="compte__nom">{user?.nom}</p>
        <p className="muted">{user?.email}</p>
        <p className="muted">
          {ROLES[user?.role] ?? user?.role}
          {user?.activite?.nom && ` · ${user.activite.nom}`}
        </p>
        <div>
          <Button variant="secondary" size="sm" onClick={deconnecter}>
            Déconnexion
          </Button>
        </div>
      </div>
    </Card>
  )
}

export function MotDePasse() {
  const [form, setForm] = useState({ actuel: '', nouveau: '', confirmation: '' })
  const [envoi, setEnvoi] = useState(false)
  const [retour, setRetour] = useState(null)

  const changer = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.value }))

  async function soumettre(e) {
    e.preventDefault()
    if (form.nouveau !== form.confirmation) {
      setRetour({ type: 'erreur', texte: 'Les deux nouveaux mots de passe ne correspondent pas.' })
      return
    }
    setEnvoi(true)
    setRetour(null)
    try {
      await api.put('/auth/mot-de-passe', { actuel: form.actuel, nouveau: form.nouveau })
      setForm({ actuel: '', nouveau: '', confirmation: '' })
      setRetour({ type: 'ok', texte: 'Mot de passe modifié.' })
    } catch (err) {
      setRetour({ type: 'erreur', texte: err.data?.details?.[0]?.message ?? err.message })
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Card className="activite__carte" title="Mot de passe">
      <form className="compte__form" onSubmit={soumettre}>
        <Input label="Mot de passe actuel" type="password" autoComplete="current-password" value={form.actuel} onChange={changer('actuel')} required />
        <Input
          label="Nouveau mot de passe (8 caractères min.)"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={form.nouveau}
          onChange={changer('nouveau')}
          required
        />
        <Input
          label="Confirmer le nouveau mot de passe"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={form.confirmation}
          onChange={changer('confirmation')}
          required
        />
        {retour && <p className={retour.type === 'erreur' ? 'field__error' : 'equipe__ok'}>{retour.texte}</p>}
        <div>
          <Button type="submit" variant="secondary" size="sm" disabled={envoi}>
            {envoi ? 'Modification…' : 'Changer le mot de passe'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

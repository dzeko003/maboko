import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../api/client.js'
import { AuthLayout } from '../../components/layout/AuthLayout.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Input } from '../../components/ui/Input.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import './Auth.css'

// Invitation ou nouveau mot de passe : choix du mot de passe, puis activation
export default function InvitationPage() {
  const { refresh } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const jeton = searchParams.get('jeton')
  const [form, setForm] = useState({ motDePasse: '', confirmation: '' })
  const [erreur, setErreur] = useState(jeton ? null : 'Ce lien est incomplet. Ouvrez à nouveau le lien reçu par e-mail.')
  const [envoi, setEnvoi] = useState(false)

  const changer = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  async function soumettre(e) {
    e.preventDefault()
    if (form.motDePasse !== form.confirmation) {
      setErreur('Les deux mots de passe ne correspondent pas.')
      return
    }
    setEnvoi(true)
    setErreur(null)
    try {
      await api.post('/auth/invitation', { jeton, motDePasse: form.motDePasse })
      await refresh()
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setErreur(err.data?.details?.[0]?.message ?? err.message)
      setEnvoi(false)
    }
  }

  return (
    <AuthLayout>
      <div className="auth">
        <div>
          <h1 className="auth__title">Choisissez votre mot de passe</h1>
          <p className="auth__intro">
            Il vous servira à vous connecter pour retrouver les interventions qui vous sont attribuées.
          </p>
        </div>

        <form className="auth__form" onSubmit={soumettre}>
          {erreur && (
            <p className="auth__error" role="alert">
              {erreur}
            </p>
          )}
          <Input
            label="Mot de passe (8 caractères minimum)"
            type="password"
            name="motDePasse"
            autoComplete="new-password"
            minLength={8}
            required
            value={form.motDePasse}
            onChange={changer}
            disabled={!jeton}
          />
          <Input
            label="Confirmer le mot de passe"
            type="password"
            name="confirmation"
            autoComplete="new-password"
            minLength={8}
            required
            value={form.confirmation}
            onChange={changer}
            disabled={!jeton}
          />
          <Button type="submit" block disabled={envoi || !jeton}>
            {envoi ? 'Activation…' : 'Activer mon compte'}
          </Button>
        </form>

        <p className="auth__footer">
          Compte déjà activé ? <Link to="/connexion">Se connecter</Link>
        </p>
      </div>
    </AuthLayout>
  )
}

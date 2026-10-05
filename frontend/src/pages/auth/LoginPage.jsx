import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { AuthLayout } from '../../components/layout/AuthLayout.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Input } from '../../components/ui/Input.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { espaceDe } from './espace.js'
import { RenvoyerActivation } from './RenvoyerActivation.jsx'
import './Auth.css'

export default function LoginPage() {
  const { user, login } = useAuth()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState({ email: '', motDePasse: '' })
  const [erreur, setErreur] = useState(null)
  const [envoi, setEnvoi] = useState(false)

  // Une fois connecté, user est rempli et on redirige vers l'espace du compte
  if (user) return <Navigate to={espaceDe(user, searchParams.get('suite'))} replace />

  const changer = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  async function soumettre(e) {
    e.preventDefault()
    setErreur(null)
    setEnvoi(true)
    try {
      await login(form.email, form.motDePasse)
    } catch (err) {
      setErreur({ message: err.message, code: err.data?.code })
      setEnvoi(false)
    }
  }

  return (
    <AuthLayout>
      <div className="auth">
        <div>
          <h1 className="auth__title">Connexion</h1>
          <p className="auth__intro">Clients et professionnels : un seul accès, vous êtes redirigé vers votre espace.</p>
        </div>

        <form className="auth__form" onSubmit={soumettre}>
          {erreur && (
            <p className="auth__error" role="alert">
              {erreur.message}
            </p>
          )}
          {erreur?.code === 'EMAIL_NON_VERIFIE' && <RenvoyerActivation email={form.email} />}
          <Input label="Email" type="email" name="email" autoComplete="email" required value={form.email} onChange={changer} />
          <Input
            label="Mot de passe"
            type="password"
            name="motDePasse"
            autoComplete="current-password"
            required
            value={form.motDePasse}
            onChange={changer}
          />
          <Button type="submit" block disabled={envoi}>
            {envoi ? 'Connexion…' : 'Se connecter'}
          </Button>
        </form>

        <p className="auth__footer">
          Pas encore de compte ? <Link to="/inscription">Créer un compte</Link>
        </p>
      </div>
    </AuthLayout>
  )
}

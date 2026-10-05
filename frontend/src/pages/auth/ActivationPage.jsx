import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { AuthLayout } from '../../components/layout/AuthLayout.jsx'
import { Input } from '../../components/ui/Input.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { espaceDe } from './espace.js'
import { RenvoyerActivation } from './RenvoyerActivation.jsx'
import './Auth.css'

export default function ActivationPage() {
  const { user, activate } = useAuth()
  const [searchParams] = useSearchParams()
  const jeton = searchParams.get('jeton')
  const [erreur, setErreur] = useState(jeton ? '' : 'Ce lien d’activation est incomplet.')
  const [email, setEmail] = useState('')
  const envoye = useRef(false)

  useEffect(() => {
    // Le jeton n'est valable qu'une fois : on évite le double appel du StrictMode
    if (!jeton || envoye.current) return
    envoye.current = true
    activate(jeton).catch((err) => setErreur(err.message))
  }, [jeton, activate])

  // Activation réussie : la session est ouverte et on part vers l'espace du compte
  if (user && !erreur) return <Navigate to={espaceDe(user)} replace />

  return (
    <AuthLayout>
      <div className="auth">
        {erreur ? (
          <>
            <div>
              <h1 className="auth__title">Activation impossible</h1>
              <p className="auth__intro">{erreur} Saisissez votre e-mail pour recevoir un nouveau lien.</p>
            </div>
            <div className="auth__form">
              <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <RenvoyerActivation email={email} label="Recevoir un nouveau lien" />
            </div>
            <p className="auth__footer">
              Compte déjà activé ? <Link to="/connexion">Se connecter</Link>
            </p>
          </>
        ) : (
          <div>
            <h1 className="auth__title">Activation en cours…</h1>
            <p className="auth__intro">Nous vérifions votre lien, vous allez être redirigé vers votre espace.</p>
          </div>
        )}
      </div>
    </AuthLayout>
  )
}

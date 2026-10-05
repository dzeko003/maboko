import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { AuthLayout } from '../../components/layout/AuthLayout.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Input } from '../../components/ui/Input.jsx'
import { Select } from '../../components/ui/Select.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { espaceDe } from './espace.js'
import { RenvoyerActivation } from './RenvoyerActivation.jsx'
import './Auth.css'

const VILLES = ['Brazzaville', 'Pointe-Noire', 'Dolisie', 'Nkayi', 'Ouesso', 'Owando', 'Impfondo', 'Madingou', 'Sibiti', 'Kinkala']
const DEVISES = ['XAF', 'EUR', 'USD']

const TYPES = {
  client: {
    titre: 'Je cherche un technicien',
    sousTitre: 'Compte client',
    intro: 'Trouvez un technicien, suivez vos interventions et donnez votre avis.',
    bouton: 'Créer mon compte client',
    icone: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
  },
  pro: {
    titre: 'Je propose mes services',
    sousTitre: 'Compte professionnel',
    intro: 'Gérez vos clients, devis et factures, et soyez visible dans l’annuaire.',
    bouton: 'Créer mon compte professionnel',
    icone: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9l-3.8 3.8Z" />,
  },
}

function VerifierBoite({ email }) {
  return (
    <AuthLayout>
      <div className="auth">
        <div>
          <div className="auth__boite" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
          </div>
          <h1 className="auth__title">Vérifiez votre boîte mail</h1>
          <p className="auth__intro">
            Nous avons envoyé un lien d’activation à <strong>{email}</strong>. Ouvrez-le pour activer votre compte : il est valable 24 heures.
          </p>
        </div>
        <RenvoyerActivation email={email} />
        <p className="auth__footer">
          Pensez à regarder dans vos spams. Compte déjà activé ? <Link to="/connexion">Se connecter</Link>
        </p>
      </div>
    </AuthLayout>
  )
}

const VIDE = { nom: '', nomActivite: '', metier: '', telephone: '', ville: VILLES[0], devise: DEVISES[0], email: '', motDePasse: '' }

export default function RegisterPage() {
  const { user, register } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [form, setForm] = useState(VIDE)
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [inscrit, setInscrit] = useState(null)

  const type = searchParams.get('type') === 'pro' ? 'pro' : 'client'
  const config = TYPES[type]

  if (user) return <Navigate to={espaceDe(user)} replace />
  if (inscrit) return <VerifierBoite email={inscrit} />

  const changer = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  function choisirType(valeur) {
    setErreur('')
    setSearchParams(valeur === 'pro' ? { type: 'pro' } : {}, { replace: true })
  }

  async function soumettre(e) {
    e.preventDefault()
    setErreur('')
    setEnvoi(true)
    const { nomActivite, metier, devise, ...commun } = form
    try {
      const { email } = await register(type === 'pro' ? { type, ...commun, nomActivite, metier, devise } : { type, ...commun })
      setInscrit(email)
    } catch (err) {
      setErreur(err.data?.details?.[0]?.message ?? err.message)
      setEnvoi(false)
    }
  }

  const champ = (name, label, props = {}) => (
    <Input label={label} name={name} value={form[name]} onChange={changer} {...props} />
  )
  const telephone = champ('telephone', type === 'pro' ? 'Téléphone / WhatsApp' : 'Téléphone', {
    type: 'tel',
    autoComplete: 'tel',
    placeholder: '+242 06…',
  })
  const ville = (
    <Select label="Ville" name="ville" value={form.ville} onChange={changer}>
      {VILLES.map((v) => (
        <option key={v}>{v}</option>
      ))}
    </Select>
  )

  return (
    <AuthLayout>
      <div className="auth">
        <div>
          <h1 className="auth__title">Créer un compte</h1>
          <p className="auth__intro">{config.intro}</p>
        </div>

        <div className="auth__types" role="radiogroup" aria-label="Type de compte">
          {Object.entries(TYPES).map(([valeur, t]) => (
            <button
              key={valeur}
              type="button"
              role="radio"
              aria-checked={type === valeur}
              className={`type-compte ${type === valeur ? 'type-compte--actif' : ''}`}
              onClick={() => choisirType(valeur)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {t.icone}
              </svg>
              <span className="type-compte__titre">{t.titre}</span>
              <span className="type-compte__sous-titre">{t.sousTitre}</span>
            </button>
          ))}
        </div>

        <form className="auth__form" onSubmit={soumettre}>
          {erreur && (
            <p className="auth__error" role="alert">
              {erreur}
            </p>
          )}

          {type === 'pro' ? (
            <>
              {champ('nomActivite', 'Nom de l’entreprise ou de l’activité', {
                required: true,
                autoComplete: 'organization',
                placeholder: 'Plomberie Mabiala',
              })}
              {champ('nom', 'Votre nom', { required: true, autoComplete: 'name' })}
              <div className="auth__ligne">
                {champ('metier', 'Métier', { placeholder: 'Plombier' })}
                {ville}
              </div>
              <div className="auth__ligne">
                {telephone}
                <Select label="Devise" name="devise" value={form.devise} onChange={changer}>
                  {DEVISES.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </Select>
              </div>
            </>
          ) : (
            <>
              {champ('nom', 'Nom complet', { required: true, autoComplete: 'name' })}
              <div className="auth__ligne">
                {telephone}
                {ville}
              </div>
            </>
          )}

          {champ('email', 'Email', { type: 'email', required: true, autoComplete: 'email' })}
          {champ('motDePasse', 'Mot de passe (8 caractères min.)', {
            type: 'password',
            required: true,
            minLength: 8,
            autoComplete: 'new-password',
          })}
          {type === 'client' && <p className="auth__note">Sur vos avis, votre nom apparaît sous la forme « Prénom N. ».</p>}

          <Button type="submit" block disabled={envoi}>
            {envoi ? 'Création…' : config.bouton}
          </Button>
        </form>

        <p className="auth__footer">
          Déjà inscrit ? <Link to="/connexion">Se connecter</Link>
        </p>
      </div>
    </AuthLayout>
  )
}

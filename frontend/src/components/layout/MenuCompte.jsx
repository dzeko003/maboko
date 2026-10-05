import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { espaceDe } from '../../pages/auth/espace.js'
import './MenuCompte.css'

const liensDe = (user) =>
  user.type === 'client'
    ? [{ to: espaceDe(user), label: 'Mon espace client' }]
    : [
        { to: '/dashboard', label: 'Tableau de bord' },
        { to: '/dashboard/profil-public', label: 'Mon profil public' },
      ]

function Avatar({ nom, grand = false }) {
  return (
    <span className={`avatar ${grand ? 'avatar--grand' : ''}`} aria-hidden="true">
      {nom.charAt(0).toUpperCase()}
      <span className="avatar__statut" />
    </span>
  )
}

export function MenuCompte() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [ouvert, setOuvert] = useState(false)
  const conteneur = useRef(null)
  const bouton = useRef(null)
  const id = useId()

  // Fermeture au clic en dehors et avec Échap (le focus revient sur l'avatar)
  useEffect(() => {
    if (!ouvert) return
    const clic = (e) => !conteneur.current?.contains(e.target) && setOuvert(false)
    const clavier = (e) => {
      if (e.key !== 'Escape') return
      setOuvert(false)
      bouton.current?.focus()
    }
    document.addEventListener('pointerdown', clic)
    document.addEventListener('keydown', clavier)
    return () => {
      document.removeEventListener('pointerdown', clic)
      document.removeEventListener('keydown', clavier)
    }
  }, [ouvert])

  async function deconnecter() {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="menu-compte" ref={conteneur}>
      <button
        ref={bouton}
        type="button"
        className="menu-compte__bouton"
        aria-expanded={ouvert}
        aria-controls={id}
        aria-label={`Menu du compte de ${user.nom}`}
        onClick={() => setOuvert((o) => !o)}
      >
        <Avatar nom={user.nom} />
      </button>

      {ouvert && (
        <div id={id} className="menu-compte__panneau">
          <div className="menu-compte__identite">
            <Avatar nom={user.nom} grand />
            <p className="menu-compte__nom">{user.nom}</p>
            <p className="menu-compte__email">{user.email}</p>
          </div>
          <nav className="menu-compte__liens" aria-label="Compte">
            {liensDe(user).map((lien) => (
              <Link key={lien.to} to={lien.to} className="menu-compte__lien" onClick={() => setOuvert(false)}>
                {lien.label}
              </Link>
            ))}
          </nav>
          <hr className="menu-compte__separateur" />
          <button type="button" className="menu-compte__lien" onClick={deconnecter}>
            Déconnexion
          </button>
        </div>
      )}
    </div>
  )
}

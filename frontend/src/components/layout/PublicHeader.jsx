import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { Logo } from './Logo.jsx'
import { MenuCompte } from './MenuCompte.jsx'
import './PublicLayout.css'

// En-tête des pages publiques ; ancres : liens vers les sections de la landing
export function PublicHeader({ ancres = false }) {
  const { user } = useAuth()

  return (
    <header className="public-header">
      <div className="container public-header__inner">
        <span className="public-header__logo">
          <Logo />
        </span>
        <nav className="public-header__nav">
          <Link to="/techniciens" className="public-header__link public-header__link--essentiel">
            Trouver un technicien
          </Link>
          {ancres && (
            <>
              <a href="#comment-ca-marche" className="public-header__link public-header__ancre">
                Comment ça marche
              </a>
              <a href="#professionnels" className="public-header__link public-header__ancre">
                Pour les professionnels
              </a>
            </>
          )}
          {user ? (
            <MenuCompte />
          ) : (
            <>
              <Link to="/connexion" className="public-header__link">
                Se connecter
              </Link>
              <Link to="/inscription?type=pro" className="btn btn--sm public-header__secondaire">
                Proposer mes services
              </Link>
              <Link to="/inscription" className="btn btn--sm public-header__principal public-header__bureau">
                Créer un compte
              </Link>
              <Link to="/connexion" className="btn btn--sm public-header__principal public-header__mobile">
                Connexion
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

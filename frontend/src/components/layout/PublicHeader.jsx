import { useId } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useMenuMobile } from '../../hooks/useMenuMobile.js'
import { Logo } from './Logo.jsx'
import { MenuCompte } from './MenuCompte.jsx'
import { BoutonBurger } from './MenuBurger.jsx'
import './PublicLayout.css'

// Même valeur que dans PublicLayout.css
const LARGEUR_MOBILE = 900

export function PublicHeader({ ancres = false }) {
  const { user } = useAuth()
  const menu = useMenuMobile(LARGEUR_MOBILE)
  const idMenu = useId()

  return (
    <header className="public-header">
      <div className="container public-header__inner">
        <span className="public-header__logo">
          <Logo />
        </span>

        <nav className="public-header__nav" aria-label="Navigation principale">
          <Link to="/techniciens" className="public-header__link">
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
          {!user && (
            <>
              <Link to="/connexion" className="public-header__link">
                Se connecter
              </Link>
              <Link to="/inscription?type=pro" className="btn btn--sm public-header__secondaire">
                Proposer mes services
              </Link>
              <Link to="/inscription" className="btn btn--sm public-header__principal">
                Créer un compte
              </Link>
            </>
          )}
        </nav>

        <div className="public-header__droite">
          {user && <MenuCompte />}
          <BoutonBurger ouvert={menu.ouvert} onClick={menu.basculer} controle={idMenu} className="public-header__burger" />
        </div>
      </div>

      {menu.ouvert && (
        <>
          <div className="public-header__voile" onClick={menu.fermer} aria-hidden="true" />
          <nav id={idMenu} className="public-menu" aria-label="Menu" onClick={menu.fermerSurLien}>
            <Link to="/techniciens" className="public-menu__lien">
              Trouver un technicien
            </Link>
            {ancres && (
              <>
                <a href="#comment-ca-marche" className="public-menu__lien">
                  Comment ça marche
                </a>
                <a href="#professionnels" className="public-menu__lien">
                  Pour les professionnels
                </a>
              </>
            )}
            {!user && (
              <div className="public-menu__actions">
                <Link to="/connexion" className="public-menu__lien">
                  Se connecter
                </Link>
                <Link to="/inscription?type=pro" className="btn public-header__secondaire public-menu__bouton">
                  Proposer mes services
                </Link>
                <Link to="/inscription" className="btn public-header__principal public-menu__bouton">
                  Créer un compte
                </Link>
              </div>
            )}
          </nav>
        </>
      )}
    </header>
  )
}

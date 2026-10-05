import { Link } from 'react-router-dom'
import './PublicLayout.css'

export function PiedDePage() {
  return (
    <footer className="public-footer">
      <div className="container public-footer__inner">
        <span>Carnet · Professionnels de terrain au Congo</span>
        <nav className="public-footer__liens">
          <Link to="/techniciens">Trouver un technicien</Link>
          <Link to="/inscription?type=pro">Proposer mes services</Link>
          <Link to="/connexion">Espace pro</Link>
        </nav>
      </div>
    </footer>
  )
}

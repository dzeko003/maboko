import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="container page-placeholder stack">
      <h1 className="page-title">Page introuvable</h1>
      <p className="muted">Cette adresse ne correspond à aucune page.</p>
      <Link to="/" className="btn btn--secondary" style={{ alignSelf: 'flex-start' }}>
        Retour à l'accueil
      </Link>
    </div>
  )
}

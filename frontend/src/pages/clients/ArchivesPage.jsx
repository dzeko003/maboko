import { Link } from 'react-router-dom'
import { ClientsListe } from './ClientsListe.jsx'

export default function ArchivesPage() {
  return (
    <div className="clients">
      <header className="clients__entete">
        <div>
          <Link to="/dashboard/clients" className="clients__retour">
            ‹ Clients
          </Link>
          <h1 className="clients__titre">Clients archivés</h1>
          <p className="muted">Un client archivé n'est plus proposé dans les formulaires ; son historique reste consultable.</p>
        </div>
      </header>
      <ClientsListe archive />
    </div>
  )
}

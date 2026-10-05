import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button.jsx'
import { ClientsListe } from './ClientsListe.jsx'
import { AjoutClient, FormulaireClient } from './FormulaireClient.jsx'

export default function ClientsPage() {
  // null : fermé ; 'nouveau' : création ; sinon le client modifié
  const [formulaire, setFormulaire] = useState(null)
  const [version, setVersion] = useState(0)

  function enregistre() {
    setFormulaire(null)
    setVersion((v) => v + 1)
  }

  function ouvrir(valeur) {
    setFormulaire(valeur)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="clients">
      <header className="clients__entete">
        <div>
          <h1 className="clients__titre">Clients</h1>
          <p className="muted">
            Vos clients externes et ceux inscrits sur Carnet. <Link to="/dashboard/clients/archives">Voir les archives</Link>
          </p>
        </div>
        <Button onClick={() => ouvrir('nouveau')} disabled={formulaire === 'nouveau'}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nouveau client
        </Button>
      </header>

      {formulaire === 'nouveau' && <AjoutClient onAnnuler={() => setFormulaire(null)} onEnregistre={enregistre} />}
      {formulaire && formulaire !== 'nouveau' && (
        <FormulaireClient key={formulaire.id} client={formulaire} onAnnuler={() => setFormulaire(null)} onEnregistre={enregistre} />
      )}

      <ClientsListe archive={false} version={version} onModifier={ouvrir} />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../api/client.js'
import { BadgeClient } from './BadgeClient.jsx'
import { Card } from '../../components/ui/Card.jsx'
import '../../components/ui/Filtres.css'
import { useAuth } from '../../context/AuthContext.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import './ClientsListe.css'
import '../../components/ui/TableCartes.css'

function Icone({ children }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

function ActionArchive({ client, onChange }) {
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState(null)
  const archiver = !client.archive

  async function basculer() {
    setEnvoi(true)
    setErreur(null)
    try {
      await api.patch(`/clients/${client.id}/archive`, { archive: archiver })
      onChange()
    } catch (err) {
      setErreur(err.message)
      setEnvoi(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="clients__action"
        onClick={basculer}
        disabled={envoi}
        aria-label={`${archiver ? 'Archiver' : 'Désarchiver'} ${client.nom}`}
        title={archiver ? 'Archiver' : 'Désarchiver'}
      >
        {archiver ? (
          <Icone>
            <rect x="3" y="4" width="18" height="5" rx="1" />
            <path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4" />
          </Icone>
        ) : (
          <Icone>
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />
          </Icone>
        )}
      </button>
      {erreur && <span className="clients__erreur">{erreur}</span>}
    </>
  )
}

export function ClientsListe({ archive = false, version = 0, onModifier }) {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const [saisie, setSaisie] = useState(q)

  // Recherche gardée dans l'URL
  useEffect(() => {
    const terme = saisie.trim()
    if (terme === q) return
    const timer = setTimeout(
      () =>
        setSearchParams(
          (p) => {
            const suivants = new URLSearchParams(p)
            if (terme) suivants.set('q', terme)
            else suivants.delete('q')
            return suivants
          },
          { replace: true },
        ),
      300,
    )
    return () => clearTimeout(timer)
  }, [saisie, q, setSearchParams])

  const params = new URLSearchParams({ archive: String(archive) })
  if (q) params.set('q', q)
  const { data, loading, error, reload } = useFetch(`/clients?${params}`)

  useEffect(() => {
    if (version > 0) reload()
  }, [version, reload])

  const clients = data ?? []

  return (
    <div className="clients__liste">
      <div className="clients__barre">
        <p className="muted">
          {clients.length} client{clients.length > 1 ? 's' : ''}
          {q ? ' pour cette recherche' : ''}
        </p>
        <label className="recherche">
          <Icone>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </Icone>
          <input
            type="search"
            placeholder="Nom, téléphone ou adresse…"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            aria-label="Rechercher un client"
          />
        </label>
      </div>

      <Card className="clients__card" title={archive ? 'Clients archivés' : 'Tous les clients'}>
        {loading && !data ? (
          <p className="clients__etat muted">Chargement…</p>
        ) : error ? (
          <p className="clients__etat muted">{error}</p>
        ) : clients.length === 0 ? (
          <p className="clients__etat muted">
            {q ? 'Aucun client ne correspond à ces critères.' : archive ? 'Aucun client archivé.' : 'Aucun client pour le moment.'}
          </p>
        ) : (
          <div className="clients__scroll">
            <table className="clients__table table-cartes">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Téléphone</th>
                  <th>Statut</th>
                  <th>Interventions</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td className="table-cartes__titre">
                      <Link to={`/dashboard/clients/${client.id}`} className="clients__nom">
                        {client.nom}
                      </Link>
                      <span className="clients__sous muted">{client.adresse || 'Adresse non renseignée'}</span>
                    </td>
                    <td data-label="Téléphone" className={client.telephone ? 'clients__tel' : 'muted'}>{client.telephone || '—'}</td>
                    <td data-label="Statut">
                      <BadgeClient client={client} />
                    </td>
                    <td data-label="Interventions">
                      {client._count.interventions} intervention{client._count.interventions > 1 ? 's' : ''}
                    </td>
                    <td className="clients__actions table-cartes__actions">
                      <Link to={`/dashboard/clients/${client.id}`} className="clients__action" aria-label={`Voir ${client.nom}`} title="Voir">
                        <Icone>
                          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                          <circle cx="12" cy="12" r="3" />
                        </Icone>
                      </Link>
                      {/* Client Carnet : consultation seule */}
                      {onModifier && !client.compteClientId && (
                        <button type="button" className="clients__action" onClick={() => onModifier(client)} aria-label={`Modifier ${client.nom}`} title="Modifier">
                          <Icone>
                            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </Icone>
                        </button>
                      )}
                      {user?.role === 'RESPONSABLE' && !client.compteClientId && <ActionArchive client={client} onChange={reload} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Card } from '../../components/ui/Card.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { formatDate, formatJourHeure } from '../../utils/format.js'
import { getStatut } from '../../utils/interventions.js'
import { BadgeClient } from './BadgeClient.jsx'
import { FormulaireClient } from './FormulaireClient.jsx'
import './ClientsListe.css'

export default function ClientDetailPage() {
  const { id } = useParams()
  const { data: client, error, reload } = useFetch(`/clients/${id}`)
  const [edition, setEdition] = useState(false)

  if (!client) {
    return (
      <div className="clients">
        <Link to="/dashboard/clients" className="clients__retour">
          ‹ Clients
        </Link>
        <p className="muted">{error ?? 'Chargement du client…'}</p>
      </div>
    )
  }

  return (
    <div className="clients">
      <header className="clients__entete">
        <div>
          <Link to={client.archive ? '/dashboard/clients/archives' : '/dashboard/clients'} className="clients__retour">
            ‹ {client.archive ? 'Clients archivés' : 'Clients'}
          </Link>
          <h1 className="clients__titre">{client.nom}</h1>
          <div className="clients__badges">
            <BadgeClient client={client} />
            {client.archive && <Badge tone="warn">Archivé</Badge>}
          </div>
        </div>
      </header>

      {edition ? (
        <FormulaireClient
          client={client}
          onAnnuler={() => setEdition(false)}
          onEnregistre={() => {
            setEdition(false)
            reload()
          }}
        />
      ) : (
        <Card
          className="clients__card"
          title="Coordonnées"
          action={
            client.compteClientId ? (
              <span className="muted clients__note">Client enregistré sur Carnet : consultation seule</span>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setEdition(true)}>
                Modifier
              </Button>
            )
          }
        >
          <dl className="clients__infos">
            <div>
              <dt className="muted">Téléphone</dt>
              <dd>{client.telephone ? <a href={`tel:${client.telephone.replace(/\s/g, '')}`}>{client.telephone}</a> : '—'}</dd>
            </div>
            <div>
              <dt className="muted">Adresse</dt>
              <dd>{client.adresse || '—'}</dd>
            </div>
            {client.compteClient && (
              <div>
                <dt className="muted">Compte Carnet</dt>
                <dd>{client.compteClient.email}</dd>
              </div>
            )}
            <div>
              <dt className="muted">Client depuis</dt>
              <dd>{formatDate(client.createdAt)}</dd>
            </div>
            {client.notes && (
              <div className="clients__infos-plein">
                <dt className="muted">Notes</dt>
                <dd>{client.notes}</dd>
              </div>
            )}
          </dl>
        </Card>
      )}

      <Card className="clients__card" title={`Interventions (${client.interventions.length})`}>
        {client.interventions.length === 0 ? (
          <p className="clients__etat muted">Aucune intervention pour ce client.</p>
        ) : (
          <div className="clients__scroll">
            <table className="clients__table">
              <thead>
                <tr>
                  <th>Date prévue</th>
                  <th>Intervention</th>
                  <th>Statut</th>
                  <th>Technicien</th>
                  <th>Réf.</th>
                </tr>
              </thead>
              <tbody>
                {client.interventions.map((i) => {
                  const statut = getStatut(i.statut)
                  return (
                    <tr key={i.id}>
                      <td className="clients__date">{i.datePrevue ? formatJourHeure(i.datePrevue) : <span className="muted">Non planifiée</span>}</td>
                      <td>
                        <Link to={`/dashboard/interventions/${i.id}`} className="clients__nom">
                          {i.objet}
                        </Link>
                      </td>
                      <td>
                        <Badge tone={statut.tone}>{statut.label}</Badge>
                      </td>
                      <td className={i.technicien ? '' : 'muted'}>{i.technicien?.nom ?? 'Non attribuée'}</td>
                      <td>
                        <Link to={`/dashboard/interventions/${i.id}`} className="clients__ref">
                          {i.reference}
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

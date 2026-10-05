import { Badge } from '../../components/ui/Badge.jsx'

// Statut du client : enregistré sur Carnet (consultation seule) ou externe (saisi par l'activité)
export function BadgeClient({ client }) {
  return client.compteClientId ? <Badge tone="info">Enregistré sur Carnet</Badge> : <Badge>Externe</Badge>
}

import { Badge } from '../../components/ui/Badge.jsx'

export function BadgeClient({ client }) {
  return client.compteClientId ? <Badge tone="info">Enregistré sur Carnet</Badge> : <Badge>Externe</Badge>
}

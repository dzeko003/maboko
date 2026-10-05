import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return null
  if (!user) return <Navigate to={`/connexion?suite=${encodeURIComponent(location.pathname)}`} replace />
  // Le dashboard est réservé aux professionnels : un client est renvoyé vers son espace
  if (user.type === 'client') return <Navigate to="/client" replace />
  return <Outlet />
}

// Pages réservées au responsable de l'activité (clients, facturation) : un technicien revient au tableau de bord
export function ResponsableRoute() {
  const { user } = useAuth()
  if (user?.role !== 'RESPONSABLE') return <Navigate to="/dashboard" replace />
  return <Outlet />
}

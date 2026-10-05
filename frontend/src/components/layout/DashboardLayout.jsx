import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { Logo } from './Logo.jsx'
import './DashboardLayout.css'

const ICONES = {
  accueil: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  interventions: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4Z" />,
  clients: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
    </>
  ),
  facturation: <path d="M6 2h9l5 5v15H6ZM14 2v6h6M9 13h6M9 17h6" />,
  profilPublic: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="11" r="2.5" />
      <path d="M5.5 17a3.5 3.5 0 0 1 7 0M15 10h3M15 14h3" />
    </>
  ),
  activite: (
    <>
      <path d="M4 21V7l8-4 8 4v14" />
      <path d="M9 21v-6h6v6M9 10h.01M15 10h.01" />
    </>
  ),
  deconnexion: <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l-5-5 5-5M5 12h11" />,
}

function Icone({ nom }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONES[nom]}
    </svg>
  )
}

// Onglets principaux ; un technicien ne voit que son travail : ni le carnet de clients, ni la facturation
const MENU = [
  { to: '/dashboard', label: 'Aujourd’hui', icone: 'accueil', end: true },
  { to: '/dashboard/interventions', label: 'Interventions', icone: 'interventions' },
  { to: '/dashboard/clients', label: 'Clients', icone: 'clients', responsable: true },
  { to: '/dashboard/facturation', label: 'Facturation', icone: 'facturation', responsable: true },
]

// Onglets du compte, placés en bas de la barre latérale
const MENU_BAS = [
  { to: '/dashboard/profil-public', label: 'Mon profil public', icone: 'profilPublic' },
  { to: '/dashboard/profil-activite', label: 'Profil de l’activité', technicien: 'Mon compte', icone: 'activite' },
]

const ROLES = { RESPONSABLE: 'Responsable', TECHNICIEN: 'Technicien' }

const initiales = (nom = '') =>
  nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot[0].toUpperCase())
    .join('')

const classeLien = ({ isActive }) => `dashboard-nav__lien ${isActive ? 'dashboard-nav__lien--actif' : ''}`

export function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const technicien = user?.role === 'TECHNICIEN'

  const lien = (item) => (
    <NavLink key={item.to} to={item.to} end={item.end} className={classeLien}>
      <Icone nom={item.icone} />
      <span>{technicien && item.technicien ? item.technicien : item.label}</span>
    </NavLink>
  )

  async function deconnecter() {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="dashboard-layout">
      <header className="dashboard-topbar">
        <Logo to="/dashboard" />
        {user && (
          <div className="dashboard-utilisateur">
            <span className="dashboard-utilisateur__avatar" aria-hidden="true">
              {initiales(user.nom)}
            </span>
            <span className="dashboard-utilisateur__texte">
              <strong>{user.nom}</strong>
              <span>{ROLES[user.role] ?? user.role}</span>
            </span>
          </div>
        )}
      </header>

      <div className="dashboard-cadre">
        <aside className="dashboard-sidebar">
          {user?.activite?.nom && <p className="dashboard-sidebar__activite">{user.activite.nom}</p>}
          <nav className="dashboard-nav" aria-label="Navigation principale">
            {MENU.filter((item) => !item.responsable || user?.role === 'RESPONSABLE').map(lien)}
          </nav>
          <nav className="dashboard-nav dashboard-nav--bas" aria-label="Compte">
            {MENU_BAS.map(lien)}
            <button type="button" className="dashboard-nav__lien" onClick={deconnecter}>
              <Icone nom="deconnexion" />
              <span>Déconnexion</span>
            </button>
          </nav>
        </aside>

        <main className="dashboard-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

import { Route, Routes } from 'react-router-dom'
import { DashboardLayout } from './components/layout/DashboardLayout.jsx'
import { ProtectedRoute, ResponsableRoute } from './components/layout/ProtectedRoute.jsx'
import { PublicLayout } from './components/layout/PublicLayout.jsx'
import ActivationPage from './pages/auth/ActivationPage.jsx'
import InvitationPage from './pages/auth/InvitationPage.jsx'
import LoginPage from './pages/auth/LoginPage.jsx'
import RegisterPage from './pages/auth/RegisterPage.jsx'
import ClientDetailPage from './pages/clients/ClientDetailPage.jsx'
import ClientsPage from './pages/clients/ClientsPage.jsx'
import DashboardPage from './pages/dashboard/DashboardPage.jsx'
import AnnuairePage from './pages/espace-client/AnnuairePage.jsx'
import EspaceClientPage from './pages/espace-client/EspaceClientPage.jsx'
import ProfilTechnicienPage from './pages/espace-client/ProfilTechnicienPage.jsx'
import FacturationPage from './pages/facturation/FacturationPage.jsx'
import InterventionDetailPage from './pages/interventions/InterventionDetailPage.jsx'
import InterventionsPage from './pages/interventions/InterventionsPage.jsx'
import LandingPage from './pages/landing/LandingPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import ProfilActivitePage from './pages/profil-activite/ProfilActivitePage.jsx'
import ProfilPublicPage from './pages/profil-public/ProfilPublicPage.jsx'
import ArchivesPage from './pages/clients/ArchivesPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<PublicLayout />}>
        <Route path="/techniciens" element={<AnnuairePage />} />
        <Route path="/t/:slug" element={<ProfilTechnicienPage />} />
        <Route path="/client" element={<EspaceClientPage />} />
      </Route>

      <Route path="/connexion" element={<LoginPage />} />
      <Route path="/activation" element={<ActivationPage />} />
      <Route path="/invitation" element={<InvitationPage />} />
      <Route path="/inscription" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="interventions" element={<InterventionsPage />} />
          <Route path="interventions/:id" element={<InterventionDetailPage />} />
          <Route element={<ResponsableRoute />}>
            <Route path="clients" element={<ClientsPage />} />
            <Route path="clients/archives" element={<ArchivesPage />} />
            <Route path="clients/:id" element={<ClientDetailPage />} />
            <Route path="facturation" element={<FacturationPage />} />
          </Route>
          <Route path="profil-public" element={<ProfilPublicPage />} />
          <Route path="profil-activite" element={<ProfilActivitePage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

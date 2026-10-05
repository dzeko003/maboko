import { Outlet } from 'react-router-dom'
import { PiedDePage } from './PiedDePage.jsx'
import { PublicHeader } from './PublicHeader.jsx'
import './PublicLayout.css'

export function PublicLayout() {
  return (
    <div className="public-layout">
      <PublicHeader />
      <main className="public-main">
        <Outlet />
      </main>
      <PiedDePage />
    </div>
  )
}

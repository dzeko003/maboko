import { Link } from 'react-router-dom'
import logoDesktop from '../../assets/logo/logo-desktop.webp'
import logoMobile from '../../assets/logo/logo-mobile.webp'
import './Logo.css'

// Logo complet (icône + nom) sur grand écran, icône seule sur mobile
export function Logo({ to = '/' }) {
  return (
    <Link to={to} className="logo">
      <picture>
        <source media="(max-width: 760px)" srcSet={logoMobile} />
        <img src={logoDesktop} alt="Maboko" className="logo__image" />
      </picture>
    </Link>
  )
}

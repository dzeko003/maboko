import { useEffect, useState } from 'react'
import image1 from '../../assets/connexion-1.webp'
import image2 from '../../assets/connexion-2.webp'
import image3 from '../../assets/connexion-3.webp'
import { Logo } from './Logo.jsx'
import './AuthLayout.css'

const SLIDES = [
  { image: image1, texte: 'Planifiez vos rendez-vous et retrouvez l’historique de chaque client.' },
  { image: image2, texte: 'Du premier appel au paiement, chaque intervention dans un seul dossier.' },
  { image: image3, texte: 'Devis, factures et paiements suivis sans rien oublier.' },
]

const DUREE_MS = 6000
const mouvementReduit = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function AuthLayout({ children }) {
  const [actif, setActif] = useState(0)

  useEffect(() => {
    if (mouvementReduit()) return
    const timer = setTimeout(() => setActif((i) => (i + 1) % SLIDES.length), DUREE_MS)
    return () => clearTimeout(timer)
  }, [actif])

  return (
    <div className="auth-layout">
      <div className="auth-layout__panneau">
        <header className="auth-layout__header">
          <Logo />
        </header>
        <main className="auth-layout__contenu">{children}</main>
        <footer className="auth-layout__footer">Carnet numérique des interventions</footer>
      </div>

      <aside className="auth-visuel" aria-hidden="true">
        {SLIDES.map((slide, i) => (
          <img
            key={slide.image}
            src={slide.image}
            alt=""
            className={`auth-visuel__image ${i === actif ? 'auth-visuel__image--active' : ''}`}
          />
        ))}
        <div className="auth-visuel__legende">
          <p key={actif} className="auth-visuel__texte">
            {SLIDES[actif].texte}
          </p>
          <div className="auth-visuel__progression">
            {SLIDES.map((slide, i) => (
              <button
                key={slide.image}
                type="button"
                tabIndex={-1}
                className={`auth-visuel__barre ${i < actif ? 'auth-visuel__barre--vue' : ''}`}
                onClick={() => setActif(i)}
              >
                {i === actif && <span key={actif} className="auth-visuel__remplissage" style={{ animationDuration: `${DUREE_MS}ms` }} />}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}

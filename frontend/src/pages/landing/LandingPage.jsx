import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import photo1 from '../../assets/connexion-1.webp'
import photo2 from '../../assets/connexion-2.webp'
import photo3 from '../../assets/connexion-3.webp'
import imgClient from '../../assets/landing/client.webp'
import imgElectricite from '../../assets/landing/electricite.webp'
import imgFroid from '../../assets/landing/froid.webp'
import imgInformatique from '../../assets/landing/informatique.webp'
import imgPeinture from '../../assets/landing/peinture.webp'
import imgPlomberie from '../../assets/landing/plomberie.webp'
import imgPro from '../../assets/landing/pro.webp'
import imgSolaire from '../../assets/landing/solaire.webp'
import imgTechnicienne from '../../assets/landing/technicienne.webp'
import { PiedDePage } from '../../components/layout/PiedDePage.jsx'
import { PublicHeader } from '../../components/layout/PublicHeader.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import './LandingPage.css'

// Landing page des visiteurs : haut rouge centré avec éventail de photos, sections numérotées,
// étapes illustrées, bande de métiers, techniciens de l'annuaire, encart pour les professionnels.
// Photos des métiers : Pexels (licence libre, usage commercial autorisé).

const ICONES = {
  drop: 'M12 3s-6 6.5-6 11a6 6 0 0 0 12 0c0-4.5-6-11-6-11z',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  snow: 'M12 2v20M4.9 7l14.2 10M4.9 17 19.1 7M9 4l3 2 3-2M9 20l3-2 3 2',
  monitor: 'M3 4h18v12H3zM8 20h8M12 16v4',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  brush: 'M18 3l3 3-9 9-3-3zM9 12l-4 4a2 2 0 0 0 0 3a2 2 0 0 0 3 0l4-4',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  send: 'M21 3 3 10.5l7 3 3 7.5zM10 13.5 21 3',
  star: 'M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6zM9 12l2 2 4-4',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4.4 3.6-8 8-8s8 3.6 8 8',
  check: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12l3 3 5-6',
  pin: 'M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
}

function Icone({ nom, taille = 20, className = '' }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={ICONES[nom]} />
    </svg>
  )
}

const VILLES = [
  'Brazzaville',
  'Pointe-Noire',
  'Dolisie',
  'Nkayi',
  'Kintélé',
  'Owando',
  'Ouesso',
  'Impfondo',
  'Madingou',
  'Sibiti',
  'Kinkala',
  'Djambala',
  'Ewo',
  'Mossendjo',
  'Oyo',
  'Gamboma',
]

const METIERS = [
  { label: 'Plomberie', recherche: 'Plombier', icone: 'drop', photo: imgPlomberie },
  { label: 'Électricité', recherche: 'Électricien', icone: 'bolt', photo: imgElectricite },
  { label: 'Froid & climatisation', recherche: 'Frigoriste', icone: 'snow', photo: imgFroid },
  { label: 'Informatique', recherche: 'Informatique', icone: 'monitor', photo: imgInformatique },
  { label: 'Solaire', recherche: 'Solaire', icone: 'sun', photo: imgSolaire },
  { label: 'Maçonnerie & peinture', recherche: 'Peintre', icone: 'brush', photo: imgPeinture },
]

const AUTRES_METIERS = ['Menuisier', 'Serrurier', 'Carreleur', 'Soudeur', 'Vitrier', 'Maintenance', 'Sécurité', 'Télécoms', 'Groupe électrogène', 'Forage']

const OUTILS_PRO = [
  'Fiches clients et historique des interventions',
  'Planning, diagnostic et photos avant / après',
  'Devis et factures en PDF, partagés sur WhatsApp',
  'Paiements partiels et reste dû suivis automatiquement',
  'Un profil public avec vos avis vérifiés',
]

const lienAnnuaire = (q) => `/techniciens?q=${encodeURIComponent(q)}`

function PhotoTechnicien({ technicien, className = '' }) {
  return technicien.photoUrl ? (
    <img src={technicien.photoUrl} alt={technicien.nom} className={`photo-technicien ${className}`} loading="lazy" />
  ) : (
    <span className={`photo-technicien photo-technicien--initiale ${className}`} aria-hidden="true">
      {technicien.nom?.charAt(0)?.toLocaleUpperCase('fr')}
    </span>
  )
}

function Etoiles({ note }) {
  const pleines = Math.round(note ?? 0)
  return (
    <span className="etoiles" aria-label={note ? `${note} sur 5` : 'Pas encore noté'}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" className={i <= pleines ? 'etoiles__pleine' : 'etoiles__vide'} aria-hidden="true">
          <path d={ICONES.star} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  )
}

// Barre de recherche métier + ville, qui mène à l'annuaire filtré
function Recherche({ empile = false }) {
  const navigate = useNavigate()
  const [ville, setVille] = useState('')
  const [q, setQ] = useState('')

  function soumettre(e) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (ville) params.set('ville', ville)
    if (q.trim()) params.set('q', q.trim())
    navigate(`/techniciens?${params}`)
  }

  return (
    <form onSubmit={soumettre} className={`recherche-landing ${empile ? 'recherche-landing--empile' : ''}`}>
      <label className="recherche-landing__champ recherche-landing__champ--large">
        <Icone nom="search" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="De quel service avez-vous besoin ?" aria-label="Service recherché" />
      </label>
      <label className="recherche-landing__champ recherche-landing__champ--ville">
        <Icone nom="pin" />
        <select value={ville} onChange={(e) => setVille(e.target.value)} aria-label="Ville">
          <option value="">Toutes les villes</option>
          {VILLES.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      <button type="submit" className="recherche-landing__bouton">
        Rechercher
      </button>
    </form>
  )
}

function Titre({ num, label, titre, sousTitre }) {
  return (
    <div className="landing-titre">
      <p className="landing-titre__surtitre">
        <span className="landing-titre__num">{num}</span>
        {label}
      </p>
      <h2>{titre}</h2>
      <p className="landing-titre__sous">{sousTitre}</p>
    </div>
  )
}

function TuileMetier({ metier }) {
  return (
    <Link to={lienAnnuaire(metier.recherche)} className="tuile-metier">
      <img src={metier.photo} alt="" loading="lazy" />
      <span className="tuile-metier__icone">
        <Icone nom={metier.icone} />
      </span>
      <span className="tuile-metier__label">{metier.label}</span>
    </Link>
  )
}

function Etape({ num, photo, icone, titre, texte }) {
  return (
    <div className="etape">
      <div className="etape__visuel">
        <img src={photo} alt="" loading="lazy" />
        <span className="etape__num">{num}</span>
      </div>
      <div className="etape__texte">
        <p className="etape__titre">
          <span className="landing-pastille landing-pastille--petite">
            <Icone nom={icone} taille={16} />
          </span>
          {titre}
        </p>
        <p className="muted">{texte}</p>
      </div>
    </div>
  )
}

function Atout({ icone, titre, texte }) {
  return (
    <div className="atout">
      <span className="landing-pastille">
        <Icone nom={icone} />
      </span>
      <div>
        <p className="atout__titre">{titre}</p>
        <p className="muted">{texte}</p>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const { data } = useFetch('/annuaire')
  const techniciens = data ?? []
  // Les mieux notés d'abord, puis ceux qui ont le plus d'avis
  const classement = [...techniciens].sort((a, b) => (b.noteMoyenne ?? 0) - (a.noteMoyenne ?? 0) || b.nbAvis - a.nbAvis)
  const meilleur = classement.find((t) => t.nbAvis > 0)
  // Un vrai avis (le plus récent du technicien le mieux noté), jamais un témoignage inventé
  const citation = meilleur?.avis?.find((a) => a.commentaire)

  return (
    <div className="landing">
      <PublicHeader ancres />

      {/* Haut de page */}
      <section className="landing-hero">
        <div className="landing-hero__contenu">
          <Link to="/techniciens" className="landing-hero__badge">
            {classement.length > 0 && (
              <span className="landing-hero__avatars">
                {classement.slice(0, 5).map((t) => (
                  <PhotoTechnicien key={t.slug} technicien={t} className="landing-hero__avatar" />
                ))}
              </span>
            )}
            {techniciens.length ? `${techniciens.length} technicien${techniciens.length > 1 ? 's' : ''} · avis de clients vérifiés` : 'Avis de clients vérifiés'}
          </Link>
          <h1 className="landing-hero__titre">Des techniciens de confiance, près de chez vous</h1>
          <p className="landing-hero__texte">Plomberie, électricité, froid, solaire… à Brazzaville, Pointe-Noire et partout au Congo.</p>
          <div className="landing-hero__recherche">
            <Recherche />
          </div>
        </div>

        {/* Éventail de photos, recouvert en bas par la section suivante */}
        <div className="landing-hero__photos">
          <img src={photo2} alt="" className="landing-hero__photo landing-hero__photo--gauche" />
          <img src={photo3} alt="" className="landing-hero__photo landing-hero__photo--droite" />
          <img src={photo1} alt="" className="landing-hero__photo landing-hero__photo--centre" />
        </div>
      </section>

      {/* 01 Services */}
      <section className="landing-services">
        <div className="landing-section">
          <Titre num="01" label="Découvrir" titre="Les services les plus demandés" sousTitre="Tout ce qu’il faut pour la maison, le bureau ou le commerce." />
          <div className="landing-services__grille">
            {METIERS.slice(0, 2).map((m) => (
              <TuileMetier key={m.label} metier={m} />
            ))}
            <div className="landing-citation">
              {citation ? (
                <blockquote>
                  <p className="landing-citation__texte">« {citation.commentaire} »</p>
                  <footer className="muted">
                    — {citation.auteur ?? 'Un client'}, à propos de {meilleur.nom}
                  </footer>
                </blockquote>
              ) : (
                <p className="landing-citation__texte">Chaque avis est laissé par un client après une vraie intervention.</p>
              )}
              <Link to="/techniciens" className="landing-bouton-contour">
                Voir tous les techniciens <Icone nom="arrowRight" taille={16} />
              </Link>
            </div>
            {METIERS.slice(2).map((m) => (
              <TuileMetier key={m.label} metier={m} />
            ))}
          </div>
        </div>
      </section>

      {/* 02 Étapes */}
      <section id="comment-ca-marche" className="landing-etapes">
        <div className="landing-section">
          <Titre num="02" label="Simple" titre="Un bon technicien en 3 étapes" sousTitre="Du besoin à l’avis, sans intermédiaire." />
          <div className="landing-etapes__grille">
            <Etape num="01" photo={photo2} icone="search" titre="Trouvez" texte="Par ville et par métier. Comparez profils, réalisations et avis." />
            <Etape num="02" photo={photo1} icone="send" titre="Contactez" texte="Appelez ou écrivez sur WhatsApp, directement au technicien." />
            <Etape
              num="03"
              photo={photo3}
              icone="star"
              titre="Donnez votre avis"
              texte="Après l’intervention, un lien personnel vous permet de noter son travail."
            />
          </div>
        </div>
      </section>

      {/* 03 Pourquoi Carnet */}
      <section className="landing-section">
        <Titre num="03" label="Pourquoi Carnet" titre="La confiance avant tout" sousTitre="Des professionnels locaux, des avis qui ne se trichent pas." />
        <div className="landing-confiance">
          <div className="landing-confiance__colonne">
            <img src={imgClient} alt="" loading="lazy" className="landing-confiance__image landing-confiance__image--haut" />
            <Atout icone="shield" titre="Avis vérifiés" texte="Un avis = un client avec un compte = une intervention terminée." />
            <Atout icone="send" titre="Contact direct" texte="WhatsApp, téléphone ou email : vous parlez au technicien, sans frais." />
          </div>
          <div className="landing-confiance__recherche">
            <p className="landing-confiance__titre">Trouver un technicien</p>
            <Recherche empile />
          </div>
          <div className="landing-confiance__colonne">
            <img src={imgTechnicienne} alt="" loading="lazy" className="landing-confiance__image" />
            <Atout icone="receipt" titre="Prix clairs" texte="Devis et factures détaillés en PDF, avant et après les travaux." />
            <Atout icone="user" titre="Votre espace" texte="Retrouvez vos interventions et vos avis dans votre compte client." />
          </div>
        </div>
      </section>

      {/* Bande de métiers */}
      <section className="landing-metiers">
        <div className="landing-metiers__liste">
          {[...METIERS.map((m) => m.recherche), ...AUTRES_METIERS].map((m) => (
            <Link key={m} to={lienAnnuaire(m)} className="landing-metiers__puce">
              <span className="landing-metiers__point" />
              {m}
            </Link>
          ))}
        </div>
      </section>

      {/* 04 Techniciens (vraies données de l'annuaire) */}
      {classement.length > 0 && (
        <section className="landing-section">
          <Titre num="04" label="Près de chez vous" titre="Rencontrez nos techniciens" sousTitre="Des professionnels qualifiés, prêts à intervenir." />
          <div className="landing-techniciens">
            {classement.slice(0, 4).map((t) => (
              <Link key={t.slug} to={`/t/${t.slug}`} className="landing-technicien">
                <PhotoTechnicien technicien={t} className="landing-technicien__photo" />
                <p className="landing-technicien__nom">{t.nom}</p>
                <p className="muted">{[t.metier, t.ville].filter(Boolean).join(' · ')}</p>
                <Etoiles note={t.noteMoyenne} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 05 Pour les professionnels */}
      <section id="professionnels" className="landing-pro">
        <div className="landing-pro__cadre">
          <div>
            <p className="landing-pro__surtitre">
              <span className="landing-pro__num">05</span>
              Pour les professionnels
            </p>
            <h2 className="landing-pro__titre">Gérez chaque intervention, du premier appel au paiement.</h2>
            <p className="landing-pro__texte">
              Indépendant ou petite équipe : Carnet remplace le cahier, les messages éparpillés et les tableurs. Et vos clients satisfaits vous font
              connaître.
            </p>
            <div className="landing-pro__actions">
              <Link to="/inscription?type=pro" className="landing-pro__principal">
                Proposer mes services <Icone nom="arrowRight" taille={16} />
              </Link>
              <Link to="/connexion" className="landing-pro__secondaire">
                Espace pro · Se connecter
              </Link>
            </div>
          </div>
          <div className="landing-pro__visuel">
            <img src={imgPro} alt="" loading="lazy" />
            <ul className="landing-pro__liste">
              {OUTILS_PRO.map((outil) => (
                <li key={outil}>
                  <Icone nom="check" className="landing-pro__coche" />
                  {outil}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <PiedDePage />
    </div>
  )
}

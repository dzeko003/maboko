import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Card } from '../../components/ui/Card.jsx'
import { api } from '../../api/client.js'
import './ProfilTechnicienPage.css'

function chiffres(numero) {
  return numero.replace(/\D/g, '')
}

function etoiles(note) {
  const valeur = Math.max(0, Math.min(5, Math.round(note || 0)))
  return `${'★'.repeat(valeur)}${'☆'.repeat(5 - valeur)}`
}

function dateAvis(date) {
  const valeur = new Date(date)
  if (Number.isNaN(valeur.getTime())) return null
  return new Intl.DateTimeFormat('fr-CG', { dateStyle: 'medium' }).format(valeur)
}

function RetourAnnuaire() {
  return (
    <Link to="/techniciens" className="profil-technicien__retour">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      Retour à l’annuaire
    </Link>
  )
}

export default function ProfilTechnicienPage() {
  const { slug } = useParams()
  const [resultat, setResultat] = useState({ slug: null, technicien: null, erreur: '' })

  useEffect(() => {
    let actif = true
    api
      .get(`/annuaire/${encodeURIComponent(slug)}`)
      .then((technicien) => {
        if (actif) setResultat({ slug, technicien, erreur: '' })
      })
      .catch((e) => {
        if (actif) {
          setResultat({
            slug,
            technicien: null,
            erreur: e.status === 404 ? 'introuvable' : e.message,
          })
        }
      })
    return () => {
      actif = false
    }
  }, [slug])

  const chargement = resultat.slug !== slug
  const { technicien, erreur } = resultat

  if (chargement) {
    return (
      <main className="container profil-technicien">
        <RetourAnnuaire />
        <p className="profil-technicien__etat" role="status">Chargement du profil…</p>
      </main>
    )
  }

  if (!technicien) {
    const introuvable = erreur === 'introuvable'
    return (
      <main className="container profil-technicien">
        <RetourAnnuaire />
        <h1 className="page-title">{introuvable ? 'Technicien introuvable' : 'Profil indisponible'}</h1>
        <p className="profil-technicien__etat" role="alert">
          {introuvable ? 'Ce profil n’existe pas ou n’est pas public.' : erreur || 'Le profil ne peut pas être chargé.'}
        </p>
      </main>
    )
  }

  const {
    nom,
    metier,
    ville,
    quartier,
    bio,
    telephone,
    whatsapp,
    activite,
    photoUrl,
    noteMoyenne = 0,
    nbAvis = 0,
    avis = [],
    realisations = [],
  } = technicien

  return (
    <main className="container profil-technicien">
      <RetourAnnuaire />

      <div className="profil-technicien__grille">
        <Card>
          <div className="profil-technicien__identite">
            {photoUrl ? (
              <img className="profil-technicien__photo" src={photoUrl} alt={`Portrait de ${nom}`} />
            ) : (
              <div className="profil-technicien__avatar" aria-hidden="true">{nom?.charAt(0)?.toLocaleUpperCase('fr')}</div>
            )}
            <div>
              <p className="profil-technicien__surtitre">Profil professionnel</p>
              <h1 className="page-title">{nom}</h1>
              {metier && <p className="profil-technicien__metier">{metier}</p>}
            </div>
          </div>

          {(quartier || ville || activite?.nom) && (
            <div className="profil-technicien__coordonnees">
              {(quartier || ville) && <p>{[quartier, ville].filter(Boolean).join(', ')}</p>}
              {activite?.nom && <p>{activite.nom}</p>}
            </div>
          )}

          <p className="profil-technicien__note" aria-label={`${noteMoyenne} sur 5, ${nbAvis} avis`}>
            <span aria-hidden="true">{etoiles(noteMoyenne)}</span>
            <span>{noteMoyenne.toLocaleString('fr-CG')} / 5 · {nbAvis} avis</span>
          </p>
          {bio && <p className="profil-technicien__bio">{bio}</p>}
        </Card>

        {(telephone || whatsapp) && (
          <Card title="Contacter ce technicien">
            <div className="profil-technicien__actions">
              {whatsapp && (
                <a
                  className="profil-technicien__bouton"
                  href={`https://wa.me/${chiffres(whatsapp)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Contacter sur WhatsApp
                </a>
              )}
              {telephone && (
                <a className="profil-technicien__bouton profil-technicien__bouton--secondaire" href={`tel:${telephone.replace(/[^\d+]/g, '')}`}>
                  Appeler {telephone}
                </a>
              )}
            </div>
          </Card>
        )}
      </div>

      {realisations.length > 0 && (
        <section className="profil-technicien__avis" aria-labelledby="realisations-titre">
          <Card title={<span id="realisations-titre">Réalisations</span>}>
            <ul className="profil-technicien__realisations">
              {realisations.map((r) => (
                <li key={r.id}>
                  {r.photoUrl && <img src={r.photoUrl} alt={r.titre} loading="lazy" />}
                  <strong>{r.titre}</strong>
                  {r.description && <p>{r.description}</p>}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      <section className="profil-technicien__avis" aria-labelledby="avis-titre">
        <Card title={<span id="avis-titre">Avis des clients</span>}>
          {avis.length === 0 ? (
            <p className="profil-technicien__vide">Aucun avis pour le moment.</p>
          ) : (
            <div className="profil-technicien__liste-avis">
              {avis.map((avisClient) => (
                <article className="profil-technicien__avis-item" key={avisClient.id}>
                  <div className="profil-technicien__avis-entete">
                    <span className="profil-technicien__avis-note" aria-label={`${avisClient.note} sur 5`}>
                      {etoiles(avisClient.note)}
                    </span>
                    {dateAvis(avisClient.createdAt) && <time dateTime={avisClient.createdAt}>{dateAvis(avisClient.createdAt)}</time>}
                  </div>
                  {avisClient.commentaire && <p>{avisClient.commentaire}</p>}
                </article>
              ))}
            </div>
          )}
        </Card>
      </section>
    </main>
  )
}
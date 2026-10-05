import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { api } from '../../api/client.js'
import './EspaceClientPage.css'

const STATUTS = {
  A_PLANIFIER: 'À planifier',
  PLANIFIEE: 'Planifiée',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminée',
  ANNULEE: 'Annulée',
}

function dateFr(date) {
  if (!date) return 'Date à confirmer'
  const valeur = new Date(date)
  if (Number.isNaN(valeur.getTime())) return 'Date à confirmer'
  return new Intl.DateTimeFormat('fr-CG', { dateStyle: 'medium', timeStyle: 'short' }).format(valeur)
}

function FormulaireAvis({ interventionId, onAvisCree }) {
  const [note, setNote] = useState('5')
  const [commentaire, setCommentaire] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  async function soumettre(e) {
    e.preventDefault()
    setEnvoi(true)
    setErreur('')
    try {
      const avis = await api.post(`/espace-client/interventions/${interventionId}/avis`, {
        note: Number(note),
        commentaire: commentaire.trim() || null,
      })
      onAvisCree(avis)
    } catch (echec) {
      setErreur(echec.message || 'Impossible d’enregistrer votre avis.')
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <form className="espace-client__formulaire-avis" onSubmit={soumettre}>
      <h3>Donner votre avis</h3>
      <label className="espace-client__champ">
        <span>Votre note</span>
        <select value={note} onChange={(e) => setNote(e.target.value)}>
          <option value="5">5 — Excellent</option>
          <option value="4">4 — Très bien</option>
          <option value="3">3 — Bien</option>
          <option value="2">2 — Moyen</option>
          <option value="1">1 — Décevant</option>
        </select>
      </label>
      <label className="espace-client__champ">
        <span>Commentaire (facultatif)</span>
        <textarea
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          maxLength={1000}
          rows={3}
        />
      </label>
      {erreur && <p className="espace-client__erreur" role="alert">{erreur}</p>}
      <button className="espace-client__bouton" type="submit" disabled={envoi}>
        {envoi ? 'Envoi…' : 'Publier mon avis'}
      </button>
    </form>
  )
}

function EspaceClientConnecte() {
  const [donnees, setDonnees] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [tentative, setTentative] = useState(0)

  useEffect(() => {
    let actif = true
    api
      .get('/espace-client')
      .then((reponse) => {
        if (actif) setDonnees(reponse)
      })
      .catch((e) => {
        if (actif) setErreur(e.message || 'Impossible de charger votre espace client.')
      })
      .finally(() => {
        if (actif) setChargement(false)
      })
    return () => {
      actif = false
    }
  }, [tentative])

  function ajouterAvis(interventionId, avis) {
    setDonnees((courant) => ({
      ...courant,
      interventions: courant.interventions.map((intervention) =>
        intervention.id === interventionId ? { ...intervention, avis } : intervention,
      ),
    }))
  }

  function recharger() {
    setErreur('')
    setChargement(true)
    setTentative((valeur) => valeur + 1)
  }

  if (chargement) return <p className="espace-client__etat" role="status">Chargement de votre espace…</p>
  if (erreur) {
    return (
      <div className="espace-client__etat espace-client__etat--erreur" role="alert">
        <p>{erreur}</p>
        <button className="espace-client__bouton" type="button" onClick={recharger}>Réessayer</button>
      </div>
    )
  }

  const { client, interventions } = donnees

  return (
    <>
      <header className="espace-client__entete">
        <p className="espace-client__surtitre">Espace personnel</p>
        <h1 className="page-title">Bonjour {client.nom}</h1>
        <p className="espace-client__introduction">
          Retrouvez le suivi de vos interventions et donnez votre avis une fois les travaux terminés.
        </p>
      </header>

      <Card title="Mon compte">
        <div className="espace-client__coordonnees">
          <span>{client.email}</span>
          {client.telephone && <span>{client.telephone}</span>}
          {client.ville && <span>{client.ville}</span>}
        </div>
      </Card>

      <section className="espace-client__interventions" aria-labelledby="interventions-titre">
        <h2 className="espace-client__titre-section" id="interventions-titre">Mes interventions</h2>
        {interventions.length === 0 ? (
          <p className="espace-client__etat">
            Aucune intervention n’est encore associée à votre compte. Demandez à votre professionnel de relier votre fiche client.
          </p>
        ) : (
          <div className="espace-client__liste">
            {interventions.map((intervention) => {
              const statut = STATUTS[intervention.statut] || intervention.statut
              const avis = intervention.avis
              const avisDejaDepose = Boolean(avis)
              const peutNoter = intervention.statut === 'TERMINEE'
                && Boolean(intervention.technicien)
                && !avisDejaDepose

              return (
                <Card className="espace-client__carte" key={intervention.id}>
                  <div className="espace-client__carte-entete">
                    <div>
                      <p className="espace-client__reference">{intervention.reference}</p>
                      <h3>{intervention.objet}</h3>
                    </div>
                    <span className={`espace-client__statut espace-client__statut--${intervention.statut.toLowerCase()}`}>
                      {statut}
                    </span>
                  </div>
                  <p className="espace-client__activite">{intervention.client.activite.nom}</p>
                  <p className="espace-client__date">Prévue ou mise à jour : {dateFr(intervention.datePrevue || intervention.createdAt)}</p>
                  {intervention.description && <p className="espace-client__description">{intervention.description}</p>}
                  {intervention.technicien && (
                    <p className="espace-client__technicien">
                      Technicien : {intervention.technicien.profilPublic && intervention.technicien.slug
                        ? <Link to={`/t/${encodeURIComponent(intervention.technicien.slug)}`}>{intervention.technicien.nom}</Link>
                        : intervention.technicien.nom}
                    </p>
                  )}
                  {avis ? (
                    <div className="espace-client__avis-existant">
                      <strong>Votre avis : {'★'.repeat(avis.note)}{'☆'.repeat(5 - avis.note)}</strong>
                      {avis.commentaire && <p>{avis.commentaire}</p>}
                    </div>
                  ) : peutNoter ? (
                    <FormulaireAvis
                      interventionId={intervention.id}
                      onAvisCree={(nouvelAvis) => ajouterAvis(intervention.id, nouvelAvis)}
                    />
                  ) : null}
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}

export default function EspaceClientPage() {
  const { user, loading } = useAuth()

  return (
    <main className="container espace-client">
      {loading ? (
        <p className="espace-client__etat" role="status">Vérification de votre session…</p>
      ) : !user ? (
        <div className="espace-client__accueil">
          <p className="espace-client__surtitre">Espace client</p>
          <h1 className="page-title">Suivez vos interventions</h1>
          <p className="espace-client__introduction">Connectez-vous pour retrouver vos interventions et partager votre avis avec les professionnels.</p>
          <Link className="espace-client__bouton espace-client__bouton--lien" to="/connexion?suite=%2Fclient">Se connecter</Link>
          <p className="espace-client__inscription">Nouveau client ? <Link to="/inscription?type=client">Créer un compte</Link></p>
        </div>
      ) : user.type !== 'client' ? (
        <div className="espace-client__accueil">
          <h1 className="page-title">Espace réservé aux clients</h1>
          <p className="espace-client__introduction">Connectez-vous avec un compte client pour consulter vos interventions.</p>
          <Link className="espace-client__bouton espace-client__bouton--lien" to="/dashboard">Aller au tableau de bord professionnel</Link>
        </div>
      ) : (
        <EspaceClientConnecte />
      )}
    </main>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Card } from '../../components/ui/Card.jsx'
import { api } from '../../api/client.js'
import './AnnuairePage.css'

function normaliser(texte) {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .trim()
}

function FicheTechnicien({ technicien }) {
  const {
    slug,
    nom,
    metier,
    ville,
    quartier,
    activite,
    photoUrl,
    noteMoyenne = 0,
    nbAvis = 0,
  } = technicien
  const etoiles = Math.max(0, Math.min(5, Math.round(noteMoyenne)))

  return (
    <Link className="annuaire__lien" to={`/t/${encodeURIComponent(slug)}`}>
      <Card className="annuaire__fiche">
        {photoUrl ? (
          <img className="annuaire__photo" src={photoUrl} alt={`Portrait de ${nom}`} loading="lazy" />
        ) : (
          <div className="annuaire__avatar" aria-hidden="true">{nom?.charAt(0)?.toLocaleUpperCase('fr')}</div>
        )}
        <div className="annuaire__details">
          <h2 className="annuaire__nom">{nom}</h2>
          {metier && <p className="annuaire__metier">{metier}</p>}
          {(quartier || ville) && <p className="annuaire__lieu">{[quartier, ville].filter(Boolean).join(', ')}</p>}
          {activite?.nom && <p className="annuaire__activite">{activite.nom}</p>}
          <p className="annuaire__avis" aria-label={`${noteMoyenne} sur 5, ${nbAvis} avis`}>
            <span aria-hidden="true">{'★'.repeat(etoiles)}{'☆'.repeat(5 - etoiles)}</span>
            <span>{nbAvis} avis</span>
          </p>
        </div>
      </Card>
    </Link>
  )
}

export default function AnnuairePage() {
  const [techniciens, setTechniciens] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  // La recherche de la landing arrive ici avec ?q=…&ville=…
  const [searchParams] = useSearchParams()
  const [recherche, setRecherche] = useState(() => searchParams.get('q') ?? '')
  const [ville, setVille] = useState(() => searchParams.get('ville') ?? '')
  const [tentative, setTentative] = useState(0)

  useEffect(() => {
    let actif = true
    api
      .get('/annuaire')
      .then((donnees) => {
        if (actif) setTechniciens(donnees)
      })
      .catch((e) => {
        if (actif) setErreur(e.message || 'Impossible de charger l’annuaire.')
      })
      .finally(() => {
        if (actif) setChargement(false)
      })

    return () => {
      actif = false
    }
  }, [tentative])

  // Garde la ville demandée même sans technicien inscrit
  const villes = useMemo(
    () => [...new Set([...techniciens.map((technicien) => technicien.ville), ville].filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'fr')),
    [techniciens, ville],
  )

  const resultats = useMemo(() => {
    const terme = normaliser(recherche)
    return techniciens.filter((technicien) => {
      const champs = [
        technicien.nom,
        technicien.metier,
        technicien.ville,
        technicien.quartier,
        technicien.activite?.nom,
      ].filter(Boolean)
      return normaliser(champs.join(' ')).includes(terme) && (!ville || technicien.ville === ville)
    })
  }, [techniciens, recherche, ville])

  function recharger() {
    setErreur('')
    setChargement(true)
    setTentative((valeur) => valeur + 1)
  }

  return (
    <main className="container annuaire">
      <header className="annuaire__entete">
        <p className="annuaire__surtitre">Annuaire des professionnels</p>
        <h1 className="page-title">Trouver un technicien</h1>
        <p className="annuaire__introduction">
          Recherchez un professionnel près de chez vous et consultez son profil et les avis de ses clients.
        </p>
      </header>

      <section className="annuaire__filtres" aria-label="Recherche et filtres">
        <label className="annuaire__champ">
          <span>Nom, métier, quartier ou entreprise</span>
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Ex. plombier, Bacongo…"
          />
        </label>
        <label className="annuaire__champ annuaire__champ--ville">
          <span>Ville</span>
          <select value={ville} onChange={(e) => setVille(e.target.value)}>
            <option value="">Toutes les villes</option>
            {villes.map((nomVille) => <option key={nomVille} value={nomVille}>{nomVille}</option>)}
          </select>
        </label>
      </section>

      {chargement ? (
        <p className="annuaire__etat" role="status">Chargement des techniciens…</p>
      ) : erreur ? (
        <div className="annuaire__etat annuaire__etat--erreur" role="alert">
          <p>{erreur}</p>
          <button className="annuaire__reessayer" type="button" onClick={recharger}>Réessayer</button>
        </div>
      ) : resultats.length === 0 ? (
        <p className="annuaire__etat">
          {techniciens.length === 0
            ? 'Aucun technicien n’a encore publié son profil.'
            : 'Aucun technicien ne correspond à votre recherche.'}
        </p>
      ) : (
        <>
          <p className="annuaire__compte" aria-live="polite">
            {resultats.length} {resultats.length === 1 ? 'technicien trouvé' : 'techniciens trouvés'}
          </p>
          <div className="annuaire__grille">
            {resultats.map((technicien) => <FicheTechnicien key={technicien.id} technicien={technicien} />)}
          </div>
        </>
      )}
    </main>
  )
}
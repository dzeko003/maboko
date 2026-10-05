import { formatMontant } from '../../utils/format.js'
import { TYPES_LIGNE, montantLigne, nouvelleLigne } from './lignes.js'

// Étiquettes masquées quand la ligne tient sur une rangée (l'en-tête suffit)
export function LignesFormulaire({ lignes, onChange }) {
  const total = lignes.reduce((somme, l) => somme + montantLigne(l), 0)

  const modifier = (cle, champ) => (e) =>
    onChange(lignes.map((l) => (l.cle === cle ? { ...l, [champ]: e.target.value } : l)))
  const retirer = (cle) => onChange(lignes.filter((l) => l.cle !== cle))
  const ajouter = (type) => onChange([...lignes, nouvelleLigne(type)])

  return (
    <div className="lignes">
      <div className="lignes__grille lignes__titres" aria-hidden="true">
        <span className="lignes__zone--designation">Désignation</span>
        <span className="lignes__zone--type">Type</span>
        <span className="lignes__zone--quantite">Qté</span>
        <span className="lignes__zone--prix">Prix unitaire</span>
        <span className="lignes__zone--total lignes__total">Total</span>
      </div>
      {lignes.map((l, i) => (
        <div key={l.cle} className="lignes__grille lignes__ligne">
          <label className="lignes__champ lignes__zone--designation">
            <span className="lignes__etiquette">Désignation (ligne {i + 1})</span>
            <input
              className="field__control"
              placeholder="Désignation"
              value={l.designation}
              onChange={modifier(l.cle, 'designation')}
              required
            />
          </label>
          <label className="lignes__champ lignes__zone--type">
            <span className="lignes__etiquette">Type</span>
            <select className="field__control" value={l.type} onChange={modifier(l.cle, 'type')}>
              {Object.entries(TYPES_LIGNE).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="lignes__champ lignes__zone--quantite">
            <span className="lignes__etiquette">Qté</span>
            <input
              className="field__control lignes__nombre"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="any"
              value={l.quantite}
              onChange={modifier(l.cle, 'quantite')}
              required
            />
          </label>
          <label className="lignes__champ lignes__zone--prix">
            <span className="lignes__etiquette">Prix unitaire</span>
            <input
              className="field__control lignes__nombre"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="0"
              value={l.prixUnitaire}
              onChange={modifier(l.cle, 'prixUnitaire')}
              required
            />
          </label>
          <div className="lignes__champ lignes__zone--total">
            <span className="lignes__etiquette">Total</span>
            <strong className="lignes__total">{formatMontant(montantLigne(l))}</strong>
          </div>
          <button
            type="button"
            className="lignes__retirer lignes__zone--retirer"
            onClick={() => retirer(l.cle)}
            disabled={lignes.length === 1}
            aria-label={`Retirer la ligne ${i + 1}`}
          >
            ×
          </button>
        </div>
      ))}
      <div className="lignes__pied">
        <span className="lignes__ajouts">
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => ajouter('MAIN_OEUVRE')}>
            + Main-d’œuvre
          </button>
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => ajouter('MATERIEL')}>
            + Matériel
          </button>
        </span>
        <span className="lignes__somme">
          Total <strong>{formatMontant(total)}</strong>
        </span>
      </div>
    </div>
  )
}

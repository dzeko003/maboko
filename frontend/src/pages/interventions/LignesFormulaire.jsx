import { formatMontant } from '../../utils/format.js'
import { TYPES_LIGNE, montantLigne, nouvelleLigne } from './lignes.js'

// Tableau de lignes d'un devis ou d'une facture : désignation, type, quantité, prix unitaire
export function LignesFormulaire({ lignes, onChange }) {
  const total = lignes.reduce((somme, l) => somme + montantLigne(l), 0)

  const modifier = (cle, champ) => (e) =>
    onChange(lignes.map((l) => (l.cle === cle ? { ...l, [champ]: e.target.value } : l)))
  const retirer = (cle) => onChange(lignes.filter((l) => l.cle !== cle))
  const ajouter = (type) => onChange([...lignes, nouvelleLigne(type)])

  return (
    <div className="lignes">
      <div className="lignes__grille lignes__titres" aria-hidden="true">
        <span>Désignation</span>
        <span>Type</span>
        <span>Qté</span>
        <span>Prix unitaire</span>
        <span className="lignes__total">Total</span>
        <span />
      </div>
      {lignes.map((l, i) => (
        <div key={l.cle} className="lignes__grille">
          <input
            className="field__control"
            placeholder="Désignation"
            aria-label={`Désignation, ligne ${i + 1}`}
            value={l.designation}
            onChange={modifier(l.cle, 'designation')}
            required
          />
          <select
            className="field__control"
            aria-label={`Type, ligne ${i + 1}`}
            value={l.type}
            onChange={modifier(l.cle, 'type')}
          >
            {Object.entries(TYPES_LIGNE).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            className="field__control"
            type="number"
            min="0.01"
            step="any"
            aria-label={`Quantité, ligne ${i + 1}`}
            value={l.quantite}
            onChange={modifier(l.cle, 'quantite')}
            required
          />
          <input
            className="field__control"
            type="number"
            min="0"
            step="any"
            placeholder="Prix unitaire"
            aria-label={`Prix unitaire, ligne ${i + 1}`}
            value={l.prixUnitaire}
            onChange={modifier(l.cle, 'prixUnitaire')}
            required
          />
          <strong className="lignes__total">{formatMontant(montantLigne(l))}</strong>
          <button
            type="button"
            className="lignes__retirer"
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

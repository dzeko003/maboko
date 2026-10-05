import { useId } from 'react'
import './Field.css'

export function Input({ label, error, className = '', ...props }) {
  const id = useId()
  return (
    <div className={`field ${className}`}>
      {label && (
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
      )}
      <input id={id} className={`field__control ${error ? 'field__control--error' : ''}`} {...props} />
      {error && <p className="field__error">{error}</p>}
    </div>
  )
}

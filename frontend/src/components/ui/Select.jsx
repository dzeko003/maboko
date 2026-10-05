import { useId } from 'react'
import './Field.css'

export function Select({ label, error, className = '', children, ...props }) {
  const id = useId()
  return (
    <div className={`field ${className}`}>
      {label && (
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
      )}
      <select id={id} className={`field__control ${error ? 'field__control--error' : ''}`} {...props}>
        {children}
      </select>
      {error && <p className="field__error">{error}</p>}
    </div>
  )
}

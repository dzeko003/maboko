import './Button.css'

export function Button({ variant = 'primary', size = 'md', block = false, className = '', ...props }) {
  const classes = ['btn', `btn--${variant}`, `btn--${size}`, block && 'btn--block', className]
  return <button type="button" className={classes.filter(Boolean).join(' ')} {...props} />
}

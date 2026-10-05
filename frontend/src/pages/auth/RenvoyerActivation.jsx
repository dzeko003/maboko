import { useState } from 'react'
import { Button } from '../../components/ui/Button.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

export function RenvoyerActivation({ email, label = 'Renvoyer le mail d’activation' }) {
  const { resendActivation } = useAuth()
  const [etat, setEtat] = useState('idle')

  async function renvoyer() {
    setEtat('envoi')
    try {
      await resendActivation(email)
      setEtat('envoye')
    } catch {
      setEtat('erreur')
    }
  }

  return (
    <div className="auth__renvoi">
      <Button variant="secondary" block disabled={!email || etat === 'envoi' || etat === 'envoye'} onClick={renvoyer}>
        {etat === 'envoi' ? 'Envoi…' : etat === 'envoye' ? 'Mail renvoyé' : label}
      </Button>
      {etat === 'envoye' && <p className="auth__note" role="status">Un nouveau lien vient d’être envoyé à {email}.</p>}
      {etat === 'erreur' && <p className="auth__note auth__note--erreur" role="alert">L’envoi a échoué, réessayez dans un instant.</p>}
    </div>
  )
}

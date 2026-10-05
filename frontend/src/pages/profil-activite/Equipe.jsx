import { useState } from 'react'
import { api } from '../../api/client.js'
import { Button } from '../../components/ui/Button.jsx'
import { Card } from '../../components/ui/Card.jsx'
import { Input } from '../../components/ui/Input.jsx'
import { useFetch } from '../../hooks/useFetch.js'

const messageErreur = (err) => err.data?.details?.[0]?.message ?? err.message

function AjoutTechnicien({ onAjoute, onAnnuler }) {
  const [form, setForm] = useState({ nom: '', email: '', telephone: '' })
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState(null)

  const changer = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.value }))

  async function soumettre(e) {
    e.preventDefault()
    setEnvoi(true)
    setErreur(null)
    try {
      const membre = await api.post('/activite/equipe', form)
      onAjoute(membre)
    } catch (err) {
      setErreur(messageErreur(err))
      setEnvoi(false)
    }
  }

  return (
    <form className="equipe__ajout" onSubmit={soumettre}>
      <Input label="Nom" value={form.nom} onChange={changer('nom')} required />
      <Input label="Email" type="email" value={form.email} onChange={changer('email')} required />
      <Input label="Téléphone / WhatsApp" type="tel" placeholder="+242 06 000 00 00" value={form.telephone} onChange={changer('telephone')} />
      <p className="equipe__aide muted">
        Il recevra un e-mail pour activer son compte et choisir son mot de passe, puis verra les interventions que vous lui
        attribuez.
      </p>
      {erreur && <p className="field__error">{erreur}</p>}
      <div className="equipe__actions-form">
        <Button type="submit" disabled={envoi}>
          {envoi ? 'Envoi de l’invitation…' : 'Ajouter'}
        </Button>
        <Button variant="ghost" onClick={onAnnuler} disabled={envoi}>
          Annuler
        </Button>
      </div>
    </form>
  )
}

function ModifierMembre({ membre, onEnregistre, onAnnuler }) {
  const [form, setForm] = useState({ nom: membre.nom, telephone: membre.telephone ?? '' })
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState(null)

  async function soumettre(e) {
    e.preventDefault()
    setEnvoi(true)
    setErreur(null)
    try {
      await api.put(`/activite/equipe/${membre.id}`, form)
      onEnregistre()
    } catch (err) {
      setErreur(messageErreur(err))
      setEnvoi(false)
    }
  }

  return (
    <form className="equipe__modif" onSubmit={soumettre}>
      <Input label="Nom" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} required />
      <Input
        label="Téléphone"
        type="tel"
        value={form.telephone}
        onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))}
      />
      {erreur && <p className="field__error">{erreur}</p>}
      <div className="equipe__actions-form">
        <Button type="submit" size="sm" disabled={envoi}>
          Enregistrer
        </Button>
        <Button variant="ghost" size="sm" onClick={onAnnuler} disabled={envoi}>
          Annuler
        </Button>
      </div>
    </form>
  )
}

function Membre({ membre, onChange }) {
  const [edition, setEdition] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [retour, setRetour] = useState(null)
  const technicien = membre.role === 'TECHNICIEN'

  async function agir(action, succes) {
    setEnvoi(true)
    setRetour(null)
    try {
      const reponse = await action()
      setRetour({ type: 'ok', texte: succes ?? reponse?.message })
      onChange()
    } catch (err) {
      setRetour({ type: 'erreur', texte: messageErreur(err) })
    } finally {
      setEnvoi(false)
    }
  }

  const details = [technicien ? 'Technicien' : 'Responsable', membre.email, membre.telephone].filter(Boolean).join(' · ')

  return (
    <li className={`equipe__membre ${membre.actif ? '' : 'equipe__membre--inactif'}`}>
      {edition ? (
        <ModifierMembre
          membre={membre}
          onAnnuler={() => setEdition(false)}
          onEnregistre={() => {
            setEdition(false)
            onChange()
          }}
        />
      ) : (
        <>
          <p className="equipe__nom">
            {membre.nom}
            {!membre.actif && <span className="equipe__etat">Désactivé</span>}
            {membre.actif && membre.invitationEnAttente && <span className="equipe__etat equipe__etat--attente">Invitation envoyée</span>}
          </p>
          <p className="equipe__details muted" title={details}>
            {details}
          </p>
          {technicien && (
            <div className="equipe__liens">
              <button type="button" onClick={() => setEdition(true)} disabled={envoi}>
                Modifier
              </button>
              {membre.actif && (
                <button type="button" onClick={() => agir(() => api.post(`/activite/equipe/${membre.id}/lien`))} disabled={envoi}>
                  {membre.invitationEnAttente ? 'Renvoyer l’invitation' : 'Nouveau mot de passe'}
                </button>
              )}
              <button
                type="button"
                className={membre.actif ? 'equipe__danger' : ''}
                onClick={() =>
                  agir(
                    () => api.patch(`/activite/equipe/${membre.id}/actif`, { actif: !membre.actif }),
                    membre.actif ? `${membre.nom} ne peut plus se connecter.` : `${membre.nom} peut de nouveau se connecter.`,
                  )
                }
                disabled={envoi}
              >
                {membre.actif ? 'Désactiver' : 'Réactiver'}
              </button>
            </div>
          )}
          {retour?.texte && <p className={retour.type === 'erreur' ? 'field__error' : 'equipe__ok'}>{retour.texte}</p>}
        </>
      )}
    </li>
  )
}

export function Equipe() {
  const { data, error, reload } = useFetch('/activite/equipe')
  const [ajout, setAjout] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const membres = data ?? []
  const actifs = membres.filter((m) => m.actif).length

  return (
    <Card
      className="activite__carte"
      title={`Équipe · ${actifs} actif${actifs > 1 ? 's' : ''}`}
      action={
        !ajout && (
          <Button variant="ghost" size="sm" onClick={() => setAjout(true)}>
            + Technicien
          </Button>
        )
      }
    >
      {ajout && (
        <AjoutTechnicien
          onAnnuler={() => setAjout(false)}
          onAjoute={(membre) => {
            setAjout(false)
            setConfirmation(`Invitation envoyée à ${membre.email}.`)
            reload()
          }}
        />
      )}
      {confirmation && <p className="equipe__ok equipe__confirmation">{confirmation}</p>}
      {error && <p className="field__error equipe__confirmation">{error}</p>}
      <ul className="equipe">
        {membres.map((m) => (
          <Membre key={m.id} membre={m} onChange={reload} />
        ))}
      </ul>
    </Card>
  )
}

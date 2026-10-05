import { useState } from 'react'
import { api } from '../../api/client.js'
import { Button } from '../../components/ui/Button.jsx'
import { Card } from '../../components/ui/Card.jsx'
import { Input } from '../../components/ui/Input.jsx'
import { Select } from '../../components/ui/Select.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { PRIORITES, STATUTS } from '../../utils/interventions.js'
import './FormulaireIntervention.css'

const VIDE = {
  client: '',
  objet: '',
  priorite: 'NORMALE',
  statut: 'A_PLANIFIER',
  datePrevue: '',
  dureeMinutes: '',
  technicienId: '',
  adresse: '',
  description: '',
}

// Format attendu par datetime-local : AAAA-MM-JJTHH:MM, heure locale
function versDateLocale(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function versFormulaire(intervention) {
  return {
    client: intervention.client.id,
    objet: intervention.objet,
    priorite: intervention.priorite,
    statut: intervention.statut,
    datePrevue: versDateLocale(intervention.datePrevue),
    dureeMinutes: intervention.dureeMinutes ?? '',
    technicienId: intervention.technicien?.id ?? '',
    adresse: intervention.adresse ?? '',
    description: intervention.description ?? '',
  }
}

function versPayload(form) {
  return {
    clientId: form.client,
    objet: form.objet,
    priorite: form.priorite,
    statut: form.statut,
    // Envoyée en ISO pour ne pas dépendre du fuseau du serveur
    datePrevue: form.datePrevue ? new Date(form.datePrevue).toISOString() : undefined,
    dureeMinutes: form.dureeMinutes || undefined,
    technicienId: form.technicienId || undefined,
    adresse: form.adresse,
    description: form.description,
  }
}

export function FormulaireIntervention({ interventionId, onEnregistree, onAnnuler }) {
  if (!interventionId) return <Formulaire initial={VIDE} onEnregistree={onEnregistree} onAnnuler={onAnnuler} />
  return <Edition key={interventionId} id={interventionId} onEnregistree={onEnregistree} onAnnuler={onAnnuler} />
}

function Edition({ id, onEnregistree, onAnnuler }) {
  const { data, loading, error } = useFetch(`/interventions/${id}`)

  if (loading || error) {
    return (
      <Card className="nouvelle-intervention">
        <p className={error ? 'field__error' : 'muted'}>{error ?? "Chargement de l'intervention…"}</p>
        {error && (
          <Button variant="ghost" onClick={onAnnuler}>
            Fermer
          </Button>
        )}
      </Card>
    )
  }

  return (
    <Formulaire
      intervention={data}
      initial={versFormulaire(data)}
      onEnregistree={onEnregistree}
      onAnnuler={onAnnuler}
    />
  )
}

function Formulaire({ intervention, initial, onEnregistree, onAnnuler }) {
  const { user } = useAuth()
  const clients = useFetch('/interventions/clients')
  const techniciens = useFetch('/activite/techniciens')
  const [form, setForm] = useState(initial)
  const [erreur, setErreur] = useState(null)
  const [envoi, setEnvoi] = useState(false)

  const edition = Boolean(intervention)
  const externes = (clients.data ?? []).filter((c) => !c.compteClientId)
  const carnet = (clients.data ?? []).filter((c) => c.compteClientId)
  const clientChoisi = (clients.data ?? []).find((c) => c.id === form.client)
  // Le client actuel peut avoir été archivé : il reste sélectionnable pour cette intervention
  const clientArchive =
    edition && !(clients.data ?? []).some((c) => c.id === intervention.client.id) ? intervention.client : null

  const changer = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.value }))

  // À la création, saisir une date fait passer « À planifier » à « Planifiée » ; le statut reste modifiable
  function changerDate(e) {
    const datePrevue = e.target.value
    setForm((f) => ({
      ...f,
      datePrevue,
      statut: !edition && datePrevue && f.statut === 'A_PLANIFIER' ? 'PLANIFIEE' : f.statut,
    }))
  }

  async function soumettre(e) {
    e.preventDefault()
    setErreur(null)
    setEnvoi(true)
    try {
      const payload = versPayload(form)
      const resultat = edition
        ? await api.put(`/interventions/${intervention.id}`, payload)
        : await api.post('/interventions', payload)
      onEnregistree(resultat)
    } catch (err) {
      setErreur(err.data?.details?.[0]?.message ?? err.message)
      setEnvoi(false)
    }
  }

  return (
    <Card className="nouvelle-intervention" title={edition ? `Modifier ${intervention.reference}` : undefined}>
      <form onSubmit={soumettre} className="nouvelle-intervention__grille">
        <Select label="Client" value={form.client} onChange={changer('client')} required>
          <option value="">{clients.loading ? 'Chargement…' : 'Choisir…'}</option>
          {clientArchive && !clients.loading && <option value={clientArchive.id}>{clientArchive.nom} (archivé)</option>}
          {externes.length > 0 && (
            <optgroup label="Externes">
              {externes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </optgroup>
          )}
          {carnet.length > 0 && (
            <optgroup label="Enregistrés sur Carnet">
              {carnet.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </optgroup>
          )}
        </Select>

        <Input label="Objet" placeholder="Fuite sous l'évier" value={form.objet} onChange={changer('objet')} required />

        <Select label="Priorité" value={form.priorite} onChange={changer('priorite')}>
          {Object.entries(PRIORITES).map(([value, p]) => (
            <option key={value} value={value}>
              {p.label}
            </option>
          ))}
        </Select>

        <Input
          label="Date et heure (optionnel)"
          type="datetime-local"
          value={form.datePrevue}
          onChange={changerDate}
        />

        <Input
          label="Durée estimée (min)"
          type="number"
          min="1"
          value={form.dureeMinutes}
          onChange={changer('dureeMinutes')}
        />

        <Select
          label="Technicien"
          value={form.technicienId}
          onChange={changer('technicienId')}
          // Refusé aussi côté serveur
          disabled={user?.role === 'TECHNICIEN'}
        >
          <option value="">Non attribuée</option>
          {(techniciens.data ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.nom}
              {t.role === 'RESPONSABLE' ? ' (responsable)' : ''}
            </option>
          ))}
        </Select>

        <Select label="Statut" value={form.statut} onChange={changer('statut')}>
          {STATUTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>

        <Input
          label="Adresse"
          placeholder={clientChoisi?.adresse ? `Par défaut : ${clientChoisi.adresse}` : 'Par défaut : adresse du client'}
          value={form.adresse}
          onChange={changer('adresse')}
        />

        <Input
          label="Description du besoin"
          className="nouvelle-intervention__plein"
          value={form.description}
          onChange={changer('description')}
        />

        {(erreur || clients.error || techniciens.error) && (
          <p className="field__error nouvelle-intervention__plein" role="alert">
            {erreur ?? clients.error ?? techniciens.error}
          </p>
        )}

        <div className="nouvelle-intervention__actions">
          <Button type="submit" disabled={envoi}>
            {envoi ? 'Enregistrement…' : edition ? 'Enregistrer' : "Créer l'intervention"}
          </Button>
          <Button variant="ghost" onClick={onAnnuler}>
            Annuler
          </Button>
        </div>
      </form>
    </Card>
  )
}

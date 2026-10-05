import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../api/client.js'
import { Button } from '../../components/ui/Button.jsx'
import { Card } from '../../components/ui/Card.jsx'
import './NouveauClientPage.css'


const VIDE = { nom: '', telephone: '', adresse: '', notes: '' }


export default function NouveauClientPage(){

    const navigate = useNavigate()
    const [mode, setMode] = useState('externe');
    const [form, setForm] = useState(VIDE);
    const [email, setEmail] = useState('');
    const [compte, setCompte] = useState(null);
    const [erreur, setErreur] = useState(null);
    const [envoi, setEnvoi] = useState(false);

    const maj = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.value }));

    function changerMode(nouveau) {
        setMode(nouveau);
        setErreur(null);
        setCompte(null);
        setEmail('')
        setForm(VIDE);
    }
    async function rechercher(e) {
        e.preventDefault()
        setErreur(null)
        setCompte(null)
        try {
        setCompte(await api.get(`/clients/compte?email=${encodeURIComponent(email.trim())}`))
        } catch (err) {
        setErreur(err.message)
        }
    }
    async function enregistrer(e) {
        e.preventDefault()
        setErreur(null)
        setEnvoi(true)
        try {
        const corps = mode === 'externe' ? form : { ...form, nom: undefined, compteClientId: compte.id }
        const client = await api.post('/clients', corps)
        navigate(`/dashboard/clients/${client.id}`)
        } catch (err) {
        setErreur(err.message)
        setEnvoi(false)
        }
    }
    const champsFiche = (
        <>
        <label className="nouveau-client__champ">
            <span>Téléphone</span>
            <input value={form.telephone} onChange={maj('telephone')} />
        </label>
        <label className="nouveau-client__champ">
            <span>Adresse</span>
            <input value={form.adresse} onChange={maj('adresse')} />
        </label>
        <label className="nouveau-client__champ">
            <span>Notes</span>
            <textarea rows={3} value={form.notes} onChange={maj('notes')} />
        </label>
        </>
    );
    return (
        <div className="stack">
        <Link to="/dashboard/clients" className="muted nouveau-client__retour"> Retour</Link>
        <h1 className="page-title">Nouveau client</h1>

        <div className="nouveau-client__modes">
            <Button variant={mode === 'externe' ? 'primary' : 'ghost'} size="sm" onClick={() => changerMode('externe')}>
            Client externe
            </Button>
            <Button variant={mode === 'carnet' ? 'primary' : 'ghost'} size="sm" onClick={() => changerMode('carnet')}>
            Client sur le Carnet
            </Button>
        </div>

        <Card title={mode === 'externe' ? 'Informations du client' : 'Rechercher un compte Carnet'}>
            <div className="nouveau-client__corps">
            {mode === 'externe' && (
                <form className="nouveau-client__form" onSubmit={enregistrer}>
                <label className="nouveau-client__champ">
                    <span>Nom *</span>
                    <input value={form.nom} onChange={maj('nom')} required minLength={2} />
                </label>
                {champsFiche}
                {erreur && <p className="nouveau-client__erreur">{erreur}</p>}
                <Button type="submit" disabled={envoi}>{envoi ? 'Enregistrement…' : 'Créer le client'}</Button>
                </form>
            )}

            {mode === 'carnet' && (
                <>
                <form className="nouveau-client__recherche" onSubmit={rechercher}>
                    <input
                    type="email"
                    placeholder="E-mail exact du client"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    />
                    <Button type="submit" variant="ghost">Rechercher</Button>
                </form>

                {compte && (
                    <form className="nouveau-client__form" onSubmit={enregistrer}>
                    <p>
                        <strong>{compte.nom}</strong>
                        {compte.ville && <span className="muted"> · {compte.ville}</span>}
                    </p>
                    {compte.dejaAjoute ? (
                        <p className="muted">Ce client est déjà dans votre carnet.</p>
                    ) : (
                        <>
                        {champsFiche}
                        <Button type="submit" disabled={envoi}>{envoi ? 'Ajout…' : 'Ajouter ce client'}</Button>
                        </>
                    )}
                    </form>
                )}
                {erreur && <p className="nouveau-client__erreur">{erreur}</p>}
                </>
            )}
            </div>
        </Card>
        </div>
    )
}
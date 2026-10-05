# Frontend

React + Vite, CSS classique.

```bash
npm run dev
npm run lint
npm run build
```

Les appels `/api` sont redirigés vers le backend (http://localhost:3000).

## Pages

| Dossier | Routes | Responsable |
|---|---|---|
| landing | / | Steven KILONDA |
| auth | /connexion, /inscription | Ketsia GOMA |
| espace-client | /techniciens, /t/:slug, /client | Steven BOTOKO |
| dashboard | /dashboard | Précieux MAVOUNGOU BAYONNE |
| interventions | /dashboard/interventions | Tony Bérenger KEDO |
| clients | /dashboard/clients | Steven KILONDA |
| facturation | /dashboard/facturation | Berenis MASSAMBA |
| profil-public | /dashboard/profil-public | Steven BOTOKO |
| profil-activite | /dashboard/profil-activite | Précieux MAVOUNGOU BAYONNE |

## Règles

- Couleurs et espacements : utiliser les variables de `styles/variables.css`.
- Un fichier CSS par page ou composant, classes préfixées par son nom.
- Appels API via `api/client.js` ou `useFetch`.
- Composants communs dans `components/`, à modifier en accord avec l'équipe.
- Branches : `feature/<page>-<tache>`, PR vers `main`.

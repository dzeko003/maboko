# Frontend

React + Vite, CSS classique.

```bash
npm run dev
npm run lint
npm run build
```

Les appels `/api` sont redirigés vers le backend (http://localhost:3000).

## Pages

| Dossier | Routes |
|---|---|
| landing | / |
| auth | /connexion, /inscription |
| espace-client | /techniciens, /t/:slug, /client |
| dashboard | /dashboard |
| interventions | /dashboard/interventions |
| clients | /dashboard/clients |
| facturation | /dashboard/facturation |
| profil-public | /dashboard/profil-public |
| profil-activite | /dashboard/profil-activite |

## Règles

- Couleurs et espacements : utiliser les variables de `styles/variables.css`.
- Un fichier CSS par page ou composant, classes préfixées par son nom.
- Appels API via `api/client.js` ou `useFetch`.
- Composants communs dans `components/`.
- Branches : `feature/<page>-<tache>`.

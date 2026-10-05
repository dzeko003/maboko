# Backend

Express 5, Prisma 7, PostgreSQL. Node 24.

## Installation

```bash
createdb carnet
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

L'API tourne sur http://localhost:3000/api.

## Scripts

- `npm run dev` : lance l'API
- `npm run db:migrate` : applique les migrations
- `npm run db:seed` : données de démo
- `npm run db:reset` : vide la base puis relance migrations et seed
- `npm run db:studio` : ouvre Prisma Studio

## Comptes de démo

Mot de passe : `demo12345`

- Responsable : demo@carnet.test
- Techniciens : grace@carnet.test, arnaud@carnet.test
- Clients : mireille@carnet.test, christian@carnet.test

## Modules

| Module | Route | Responsable |
|---|---|---|
| auth | /api/auth | Ketsia GOMA |
| annuaire | /api/annuaire | Steven BOTOKO |
| espace-client | /api/espace-client | Steven BOTOKO |
| dashboard | /api/dashboard | Précieux MAVOUNGOU BAYONNE |
| interventions | /api/interventions | Tony Bérenger KEDO |
| clients | /api/clients | Steven KILONDA |
| facturation | /api/facturation | Berenis MASSAMBA |
| profil-public | /api/profil-public | Steven BOTOKO |
| activite | /api/activite | Précieux MAVOUNGOU BAYONNE |

Seuls `auth` et `annuaire` sont accessibles sans connexion.

## Fichiers

Les fichiers sont stockés sur Cloudflare R2. Demander les variables `R2_*` et les ajouter dans `.env`.

- `carnet-prives` : photos d'intervention, documents, logo
- `carnet-publics` : photos de profil, réalisations

Utiliser `uploadImage` / `uploadDocument` (`middleware/upload.js`) puis les fonctions de `utils/stockage.js`.
En base on enregistre le chemin du fichier, pas l'URL.

## Règles

- Valider les entrées avec zod.
- Lever les erreurs avec `HttpError`.
- Toujours filtrer les données sur l'activité de l'utilisateur connecté.
- Une migration par PR : `npm run db:migrate -- --name nom_migration`.
- Ne jamais commiter `.env`.

# Carnet numérique des interventions

Application de suivi des interventions pour les techniciens et artisans du Congo-Brazzaville : clients, interventions, devis, factures et annuaire public des techniciens avec avis clients.

## Stack

- Frontend : React, Vite, CSS
- Backend : Express, Prisma, PostgreSQL
- Fichiers : Cloudflare R2

## Structure

```
frontend/   application React
backend/    API Express et base de données
```

## Prérequis

- Node.js 24
- PostgreSQL

## Installation

```bash
npm run install:all
```

Puis configurer le backend (voir `backend/README.md`) :

```bash
cd backend
cp .env.example .env
npm run db:migrate
npm run db:seed
```

## Lancer le projet

```bash
npm run dev
```

- Frontend : http://localhost:5173
- API : http://localhost:3000/api

## Équipe

| Développeur | Pages |
|---|---|
| Ketsia GOMA | Connexion, inscription |
| Steven KILONDA | Landing, clients |
| Steven BOTOKO | Espace client, annuaire, profil public |
| Précieux MAVOUNGOU BAYONNE | Dashboard, profil de l'activité |
| Tony Bérenger KEDO | Interventions |
| Berenis MASSAMBA | Facturation |

## Contribuer

- Une branche par tâche à créer en partant de la branche `develop` : `feature/<page>-<tache>`
- PR vers la branche `develop` avec au moins une relecture
- `npm run lint` dans `frontend/` avant chaque PR

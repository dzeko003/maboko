import crypto from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env.js";
import { r2 } from "../db/r2.js";
import { HttpError } from "./httpError.js";

export const BUCKETS = {
  prive: env.R2_BUCKET_PRIVE,
  public: env.R2_BUCKET_PUBLIC,
};

export const dossiers = {
  intervention: (activiteId, interventionId) => `${activiteId}/interventions/${interventionId}`,
  logo: (activiteId) => `${activiteId}/logo`,
  profil: (utilisateurId) => `profils/${utilisateurId}`,
};

// Sans R2 (développement), les fichiers sont écrits sur le disque du serveur
const DOSSIER_LOCAL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../uploads");
export const stockageLocal = !r2;

function cheminLocal(bucket, chemin) {
  const complet = path.resolve(DOSSIER_LOCAL, bucket, chemin);
  if (!complet.startsWith(DOSSIER_LOCAL + path.sep)) throw new HttpError(400, "Chemin de fichier invalide");
  return complet;
}

function client() {
  if (!r2) throw new HttpError(503, "Stockage non configuré");
  return r2;
}

export async function envoyerFichier({ bucket, dossier, fichier }) {
  if (!fichier) throw new HttpError(400, "Aucun fichier reçu");
  const extension = path.extname(fichier.originalname).toLowerCase();
  const chemin = `${dossier}/${crypto.randomUUID()}${extension}`;

  if (stockageLocal) {
    const cible = cheminLocal(bucket, chemin);
    await mkdir(path.dirname(cible), { recursive: true });
    await writeFile(cible, fichier.buffer);
  } else {
    await client().send(
      new PutObjectCommand({ Bucket: bucket, Key: chemin, Body: fichier.buffer, ContentType: fichier.mimetype }),
    );
  }

  return { chemin, typeMime: fichier.mimetype, taille: fichier.size, nomOriginal: fichier.originalname };
}

// Flux de lecture d'un fichier stocké en local (le serveur le renvoie lui-même)
export async function lireFichierLocal(bucket, chemin) {
  const cible = cheminLocal(bucket, chemin);
  await stat(cible).catch(() => {
    throw new HttpError(404, "Fichier introuvable");
  });
  return createReadStream(cible);
}

// Contenu complet d'un fichier (pour l'intégrer dans un PDF, par exemple)
export async function lireFichier(bucket, chemin) {
  if (stockageLocal) return readFile(cheminLocal(bucket, chemin));
  const reponse = await client().send(new GetObjectCommand({ Bucket: bucket, Key: chemin }));
  return Buffer.from(await reponse.Body.transformToByteArray());
}

export function lienTemporaire(chemin, secondes = 600) {
  return getSignedUrl(client(), new GetObjectCommand({ Bucket: BUCKETS.prive, Key: chemin }), { expiresIn: secondes });
}

export function urlPublique(chemin) {
  if (!chemin) return null;
  if (!env.R2_PUBLIC_URL) throw new HttpError(503, "R2_PUBLIC_URL non configurée");
  return `${env.R2_PUBLIC_URL.replace(/\/$/, "")}/${chemin}`;
}

export async function supprimerFichier(bucket, chemin) {
  if (!chemin) return;
  if (stockageLocal) return rm(cheminLocal(bucket, chemin), { force: true });
  await client().send(new DeleteObjectCommand({ Bucket: bucket, Key: chemin }));
}

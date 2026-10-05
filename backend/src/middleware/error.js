import multer from "multer";
import { ZodError } from "zod";
import { HttpError } from "../utils/httpError.js";

export function routeNotFound(req, res) {
  res.status(404).json({ message: `Route introuvable : ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ message: "Données invalides", details: err.issues });
  }
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "Fichier trop volumineux" : "Envoi de fichier invalide";
    return res.status(400).json({ message });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message, code: err.code });
  }
  console.error(err);
  res.status(500).json({ message: "Erreur serveur" });
}

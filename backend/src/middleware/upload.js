import multer from "multer";
import { HttpError } from "../utils/httpError.js";

const IMAGES = ["image/jpeg", "image/png", "image/webp"];
const DOCUMENTS = [...IMAGES, "application/pdf"];
const Mo = 1024 * 1024;

function accepter(types, tailleMax) {
  const recevoir = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: tailleMax, files: 1 },
    fileFilter: (req, file, cb) =>
      types.includes(file.mimetype) ? cb(null, true) : cb(new HttpError(400, "Type de fichier non autorisé")),
  }).single("fichier");

  return (req, res, next) =>
    recevoir(req, res, (err) =>
      next(err?.code === "LIMIT_FILE_SIZE" ? new HttpError(400, `Fichier trop volumineux (${tailleMax / Mo} Mo max)`) : err),
    );
}

export const uploadImage = accepter(IMAGES, 5 * Mo);

// Logo de l'activité : PNG ou JPEG uniquement, les seuls formats que les PDF savent intégrer
export const uploadLogo = accepter(["image/png", "image/jpeg"], 2 * Mo);

export const uploadDocument = accepter(DOCUMENTS, 10 * Mo);

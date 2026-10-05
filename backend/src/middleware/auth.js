import { HttpError } from "../utils/httpError.js";
import { lireSession } from "../utils/session.js";

export function requireAuth(req, res, next) {
  const user = lireSession(req);
  if (!user) throw new HttpError(401, "Connexion requise");
  req.user = user;
  next();
}

export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user?.role)) throw new HttpError(403, "Accès refusé");
    next();
  };

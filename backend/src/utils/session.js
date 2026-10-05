import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

const SESSION_COOKIE = "carnet_session";
const DUREE_MS = 7 * 24 * 60 * 60 * 1000;

export function ouvrirSession(res, payload) {
  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: DUREE_MS / 1000 });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: DUREE_MS,
  });
}

export function fermerSession(res) {
  res.clearCookie(SESSION_COOKIE);
}

export function lireSession(req) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch {
    return null;
  }
}

export class HttpError extends Error {
  // code : identifiant optionnel que le frontend peut tester (ex. "EMAIL_NON_VERIFIE")
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const notFound = (what = "Ressource") => new HttpError(404, `${what} introuvable`);

import { z } from "zod";

const optionnel = z.preprocess((v) => (v === "" ? undefined : v), z.string().optional());

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, "JWT_SECRET doit faire au moins 32 caractères"),
  CLIENT_URL: z.string().default("http://localhost:5173"),

  R2_ACCOUNT_ID: optionnel,
  R2_ACCESS_KEY_ID: optionnel,
  R2_SECRET_ACCESS_KEY: optionnel,
  R2_BUCKET_PRIVE: z.string().default("carnet-prives"),
  R2_BUCKET_PUBLIC: z.string().default("carnet-publics"),
  R2_PUBLIC_URL: optionnel,

  SMTP_HOST: optionnel,
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: optionnel,
  SMTP_PASS: optionnel,
  MAIL_FROM: z.string().default("Maboko <no-reply@maboko.local>"),
});

const result = schema.safeParse(process.env);
if (!result.success) {
  console.error("Configuration invalide (.env) :");
  for (const issue of result.error.issues) console.error(`  ${issue.path.join(".")} : ${issue.message}`);
  process.exit(1);
}

export const env = result.data;

export const stockageActif = Boolean(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY);
if (!stockageActif) {
  console.warn("Stockage R2 non configuré (R2_* dans .env) : les fichiers sont enregistrés dans backend/uploads.");
}

export const mailActif = Boolean(env.SMTP_HOST);
if (!mailActif) {
  console.warn("SMTP non configuré (SMTP_* dans .env) : les e-mails sont affichés dans la console.");
}

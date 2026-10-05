import nodemailer from "nodemailer";
import { env, mailActif } from "../config/env.js";

const APP = "Maboko";

// Logo joint à chaque mail HTML et affiché via cid: (fonctionne sans site public, contrairement à une URL)
const LOGO = {
  filename: "logo-maboko.png",
  path: new URL("../assets/logo-mail.png", import.meta.url).pathname,
  cid: "logo-maboko",
};

const transport = mailActif
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null;

// Sans SMTP (développement), le mail est affiché dans la console du backend au lieu d'être envoyé
export async function envoyerMail({ to, subject, text, html }) {
  if (!transport) {
    console.log(`\n✉️  Mail pour ${to} — ${subject}\n${text}\n`);
    return;
  }
  await transport.sendMail({ from: env.MAIL_FROM, to, subject, text, html, attachments: html ? [LOGO] : [] });
}

const echapper = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// Gabarit commun à tous les mails : tableaux et styles en ligne, seuls compris par tous les clients mail
function gabarit(contenu) {
  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f6f6">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #ececec;border-radius:12px;font-family:Arial,Helvetica,sans-serif;color:#141414">
        <tr><td style="padding:28px 32px 8px">
          <img src="cid:${LOGO.cid}" alt="${APP}" width="146" height="40" style="display:block;border:0">
        </td></tr>
        <tr><td style="padding:16px 32px 32px;font-size:15px;line-height:1.6">
          ${contenu}
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6b6b6b">${APP} · Carnet numérique des interventions</p>
    </td></tr>
  </table>
</body>
</html>`;
}

export function mailActivation({ nom, lien, heures }) {
  const subject = `Activez votre compte ${APP}`;
  const text = `Bonjour ${nom},

Bienvenue sur ${APP} ! Pour activer votre compte, ouvrez ce lien :
${lien}

Ce lien est valable ${heures} heures. Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message.`;

  const html = gabarit(`
          <p style="margin:0 0 16px">Bonjour ${echapper(nom)},</p>
          <p style="margin:0 0 24px">Bienvenue sur <strong>${APP}</strong> ! Pour activer votre compte, cliquez sur le bouton ci-dessous.</p>
          <p style="margin:0 0 24px">
            <a href="${lien}" style="display:inline-block;background:#db0000;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Activer mon compte</a>
          </p>
          <p style="margin:0;color:#6b6b6b;font-size:13px">Ce lien est valable ${heures} heures. Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message.</p>`);

  return { subject, text, html };
}

// Invitation d'un technicien par le responsable : il choisit son mot de passe en activant son compte
export function mailInvitation({ nom, activite, invitePar, lien, heures }) {
  const subject = `${activite} vous invite sur ${APP}`;
  const text = `Bonjour ${nom},

${invitePar} vous a ajouté à l'équipe de ${activite} sur ${APP}. Pour activer votre compte et choisir votre mot de passe, ouvrez ce lien :
${lien}

Ce lien est valable ${heures} heures. Vous retrouverez ensuite les interventions qui vous sont attribuées.`;

  const html = gabarit(`
          <p style="margin:0 0 16px">Bonjour ${echapper(nom)},</p>
          <p style="margin:0 0 24px"><strong>${echapper(invitePar)}</strong> vous a ajouté à l'équipe de <strong>${echapper(activite)}</strong> sur ${APP}. Activez votre compte et choisissez votre mot de passe :</p>
          <p style="margin:0 0 24px">
            <a href="${lien}" style="display:inline-block;background:#db0000;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Activer mon compte</a>
          </p>
          <p style="margin:0;color:#6b6b6b;font-size:13px">Ce lien est valable ${heures} heures. Vous retrouverez ensuite les interventions qui vous sont attribuées.</p>`);

  return { subject, text, html };
}

// Nouveau mot de passe demandé par le responsable pour un membre de l'équipe
export function mailNouveauMotDePasse({ nom, activite, lien, heures }) {
  const subject = `Choisissez un nouveau mot de passe ${APP}`;
  const text = `Bonjour ${nom},

Le responsable de ${activite} vous permet de choisir un nouveau mot de passe. Ouvrez ce lien :
${lien}

Ce lien est valable ${heures} heures. Tant que vous ne l'utilisez pas, votre mot de passe actuel reste valable.`;

  const html = gabarit(`
          <p style="margin:0 0 16px">Bonjour ${echapper(nom)},</p>
          <p style="margin:0 0 24px">Le responsable de <strong>${echapper(activite)}</strong> vous permet de choisir un nouveau mot de passe.</p>
          <p style="margin:0 0 24px">
            <a href="${lien}" style="display:inline-block;background:#db0000;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Choisir mon mot de passe</a>
          </p>
          <p style="margin:0;color:#6b6b6b;font-size:13px">Ce lien est valable ${heures} heures. Tant que vous ne l'utilisez pas, votre mot de passe actuel reste valable.</p>`);

  return { subject, text, html };
}

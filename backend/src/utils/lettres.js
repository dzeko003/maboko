// Montant en toutes lettres, en français (règles de 1990 : traits d'union partout), pour les reçus
const UNITES = [
  "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf",
];
const DIZAINES = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];

// 0 à 99
function deuxChiffres(n) {
  if (n < 20) return UNITES[n];
  const d = Math.floor(n / 10);
  let u = n % 10;
  // 70-79 et 90-99 se construisent sur 60 et 80 : soixante-dix, quatre-vingt-onze…
  if (d === 7 || d === 9) u += 10;
  if (u === 0) return d === 8 ? "quatre-vingts" : DIZAINES[d];
  if ((u === 1 || u === 11) && d !== 8 && d !== 9) return `${DIZAINES[d]}-et-${UNITES[u]}`;
  return `${DIZAINES[d]}-${UNITES[u]}`;
}

// 0 à 999 ; « final » indique que rien ne suit (cents et quatre-vingts ne prennent le s qu'en fin de nombre)
function troisChiffres(n, final) {
  const c = Math.floor(n / 100);
  const reste = n % 100;
  let texte = "";
  if (c > 0) texte = c === 1 ? "cent" : `${UNITES[c]}-cent${reste === 0 && final ? "s" : ""}`;
  if (reste > 0) {
    let fin = deuxChiffres(reste);
    if (!final && fin === "quatre-vingts") fin = "quatre-vingt";
    texte = texte ? `${texte}-${fin}` : fin;
  }
  return texte;
}

function nombreEnLettres(nombre) {
  let n = Math.floor(Math.abs(nombre));
  if (n === 0) return UNITES[0];
  const groupes = [
    [1_000_000_000, "milliard"],
    [1_000_000, "million"],
    [1000, "mille"],
  ];
  let texte = "";
  // million et milliard sont des noms : ils s'accordent et restent séparés par des espaces
  const ajouter = (morceau, separateur) => (texte = texte ? `${texte}${separateur}${morceau}` : morceau);
  for (const [valeur, nom] of groupes) {
    const q = Math.floor(n / valeur);
    n %= valeur;
    if (q === 0) continue;
    if (nom === "mille") ajouter(q === 1 ? "mille" : `${troisChiffres(q, false)}-mille`, " ");
    else ajouter(`${troisChiffres(q, true)} ${nom}${q > 1 ? "s" : ""}`, " ");
  }
  // Ce qui suit « mille » s'y lie par un trait d'union : mille-quatre-vingts
  if (n > 0) ajouter(troisChiffres(n, true), texte.endsWith("mille") ? "-" : " ");
  return texte;
}

export function montantEnLettres(montant, devise) {
  const entier = Math.round(Number(montant) || 0);
  const libelle = devise === "XAF" ? "francs CFA" : devise;
  const texte = nombreEnLettres(entier);
  return `${texte.charAt(0).toUpperCase()}${texte.slice(1)} ${libelle}`;
}

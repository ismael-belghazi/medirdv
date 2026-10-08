// Ce que le service peut constater lui-même sur GCP, sans bibliothèque : le serveur de métadonnées,
// et quelques API Google appelées en lecture seule avec l'identité du service.
// Hors de GCP, le serveur de métadonnées ne répond pas et les fonctions renvoient null.
const META = 'http://metadata.google.internal/computeMetadata/v1/';
let surGcp = null;

export async function metadata(chemin) {
  if (surGcp === false) return null;
  try {
    const res = await fetch(META + chemin, { headers: { 'Metadata-Flavor': 'Google' }, signal: AbortSignal.timeout(1500) });
    surGcp = true;
    return res.ok ? (await res.text()).trim() : null;
  } catch {
    surGcp = false;
    return null;
  }
}

// Appel en lecture seule d'une API Google, avec le jeton de l'identité attachée au service.
export async function appelGoogle(url) {
  const jeton = await metadata('instance/service-accounts/default/token');
  if (!jeton) return { status: 0, body: {} };
  const res = await fetch(url, { headers: { Authorization: `Bearer ${JSON.parse(jeton).access_token}` }, signal: AbortSignal.timeout(5000) });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

export const bloc = (id, nom, etat, detail = '', preuve = '') => ({ id, nom, etat, detail, preuve });

export function blocCloudRun(nom = 'Cloud Run') {
  return process.env.K_SERVICE
    ? bloc('run', nom, 'ok', `service ${process.env.K_SERVICE}, révision ${process.env.K_REVISION}`, 'K_SERVICE et K_REVISION, fournies par Cloud Run')
    : bloc('run', nom, 'simule', 'conteneur ou processus local');
}

// Un compte de service dédié, ou l'un de ceux que GCP crée par défaut avec des droits larges.
export async function blocIdentite() {
  const email = await metadata('instance/service-accounts/default/email');
  if (!email) return bloc('identite', 'Identité du service', 'simule', 'pas de compte de service en local');
  return /-compute@developer\.gserviceaccount\.com$|@appspot\.gserviceaccount\.com$/.test(email)
    ? bloc('identite', 'Identité du service', 'alerte', 'compte de service créé par défaut, aux droits souvent trop larges', email)
    : bloc('identite', 'Identité du service', 'ok', 'identité dédiée attachée au service', email);
}

// Évite d'appeler les API à chaque rafraîchissement de la page.
export function enCache(calcul, secondes = 10) {
  let valeur = null;
  let expire = 0;
  return async () => {
    if (Date.now() > expire) {
      valeur = await calcul();
      expire = Date.now() + secondes * 1000;
    }
    return valeur;
  };
}

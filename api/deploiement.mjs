// Carte du déploiement de MediRdv : ce que le service constate lui-même, bloc par bloc.
// Hors de GCP, les blocs sont simulés. Sur GCP, les lectures se font avec l'identité du service :
// la configuration de l'instance Cloud SQL est couverte par roles/cloudsql.client, déjà nécessaire
// au connecteur ; l'entrée du service demande roles/run.viewer, facultatif.
import { appelGoogle, bloc, blocCloudRun, blocIdentite, metadata, enCache } from './gcp.mjs';
import { stockage, choisirMode, sourceMotDePasse, lireSecret } from './stockage.mjs';

const local = !process.env.K_SERVICE;
const prive = (hote = '') => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hote);
const couchesReseau = ['ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EHOSTUNREACH', 'ECONNRESET'];

async function blocEntree() {
  if (local) return bloc('entree', 'Entrée du service', 'simule', 'port 8080 publié par Compose');
  const projet = await metadata('project/project-id');
  const region = (await metadata('instance/region'))?.split('/').pop();
  const service = `projects/${projet}/locations/${region}/services/${process.env.K_SERVICE}`;
  const config = await appelGoogle(`https://run.googleapis.com/v2/${service}`);
  if (config.status !== 200) return bloc('entree', 'Entrée du service', 'inconnu', 'pour afficher ce bloc, donnez au service roles/run.viewer sur lui-même (facultatif)', `lecture de la configuration : HTTP ${config.status}`);
  const politique = await appelGoogle(`https://run.googleapis.com/v2/${service}:getIamPolicy`);
  const publique = (politique.body.bindings || []).some((b) => b.role === 'roles/run.invoker' && b.members?.includes('allUsers'));
  const ingress = { INGRESS_TRAFFIC_ALL: 'tout Internet', INGRESS_TRAFFIC_INTERNAL_ONLY: 'interne uniquement', INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER: 'interne et Load Balancer' }[config.body.ingress] || config.body.ingress;
  return bloc('entree', 'Entrée du service', 'ok', `ingress : ${ingress}, invocation ${publique ? 'publique (allUsers)' : 'réservée aux identités autorisées'}`, `ingress = ${config.body.ingress}`);
}

async function blocSecret() {
  const source = sourceMotDePasse();
  const nom = 'Secret Manager';
  if (choisirMode() === 'memoire') return bloc('secret', nom, 'simule', 'pas de mot de passe en mode mémoire');
  if (local) return bloc('secret', nom, 'simule', source === 'fichier' ? 'fichier monté par Compose à la place du secret' : `mot de passe fourni par ${source}`);
  if (source === 'secret') {
    try {
      await lireSecret();
      return bloc('secret', nom, 'ok', 'secret lu dans Secret Manager par l’identité du service', process.env.DB_PASSWORD_SECRET);
    } catch (error) {
      return bloc('secret', nom, 'echec', error.code === 'PERMISSION_DENIED' ? 'accès au secret refusé : l’identité a-t-elle secretAccessor sur ce secret ?' : 'secret illisible : nom ou version introuvable ?', error.message);
    }
  }
  if (source === 'fichier') return bloc('secret', nom, 'ok', 'mot de passe monté comme fichier par Cloud Run', process.env.DB_PASSWORD_FILE);
  return bloc('secret', nom, 'manuel', 'mot de passe reçu en variable : montrez dans la console qu’il vient bien de Secret Manager');
}

function blocsConnexion(erreur) {
  const mode = choisirMode();
  const code = String(erreur?.code || '');
  if (mode === 'memoire') return [bloc('vpc', 'Sortie VPC et accès privé', 'simule', 'pas de réseau en mode mémoire'), bloc('sql', 'Cloud SQL PostgreSQL', 'simule', 'aucune base : les données restent en mémoire')];
  if (mode === 'non configuré' || code === 'CONFIG') return [bloc('vpc', 'Sortie VPC et accès privé', 'inconnu', 'base non configurée'), bloc('sql', 'Cloud SQL PostgreSQL', 'inconnu', erreur?.message || 'base non configurée')];
  if (local) {
    return [
      bloc('vpc', 'Sortie VPC et accès privé', 'simule', 'réseau interne de Docker'),
      erreur ? bloc('sql', 'Cloud SQL PostgreSQL', 'echec', 'la base locale ne répond pas', `code ${code}`) : bloc('sql', 'Cloud SQL PostgreSQL', 'simule', 'PostgreSQL local, connecté'),
    ];
  }
  const chemin = mode === 'connecteur' ? 'le connecteur ne tente que l’IP privée de l’instance' : `connexion directe à ${process.env.DB_HOST}`;
  if (erreur && couchesReseau.includes(code)) {
    return [bloc('vpc', 'Sortie VPC et accès privé', 'echec', 'la base est injoignable sur le réseau : sortie VPC, subnet, Private Service Access ?', `code ${code}`), bloc('sql', 'Cloud SQL PostgreSQL', 'inconnu', 'en attente d’un chemin réseau')];
  }
  const vpc = mode === 'direct' && !prive(process.env.DB_HOST)
    ? bloc('vpc', 'Sortie VPC et accès privé', 'alerte', 'la base est jointe par une adresse qui n’est pas privée', process.env.DB_HOST)
    : bloc('vpc', 'Sortie VPC et accès privé', 'ok', 'le chemin privé vers la base fonctionne', chemin);
  if (erreur) return [vpc, bloc('sql', 'Cloud SQL PostgreSQL', 'echec', code === '28P01' ? 'le réseau répond, mais l’authentification PostgreSQL échoue' : 'la base répond avec une erreur', `code ${code}`)];
  return [vpc, bloc('sql', 'Cloud SQL PostgreSQL', 'ok', 'connexion et authentification réussies', `mode ${mode}`)];
}

// Lecture de la configuration de l'instance par l'API Cloud SQL Admin.
async function blocsInstance() {
  const blocs = (etat, detail, preuve = '') => [
    bloc('exposition', 'Exposition de la base', etat, detail, preuve),
    bloc('sauvegardes', 'Sauvegardes et PITR', etat, detail),
    bloc('disponibilite', 'Disponibilité', etat, detail),
  ];
  if (local || choisirMode() === 'memoire') return blocs('simule', 'non simulé en local : à vérifier sur l’instance Cloud SQL');
  const nom = process.env.INSTANCE_CONNECTION_NAME;
  if (!nom) return blocs('inconnu', 'renseignez INSTANCE_CONNECTION_NAME pour lire la configuration de l’instance');
  const [projet, , instance] = nom.split(':');
  const { status, body } = await appelGoogle(`https://sqladmin.googleapis.com/v1/projects/${projet}/instances/${instance}`);
  if (status !== 200) return blocs('inconnu', 'lecture de la configuration refusée : roles/cloudsql.client couvre normalement cette lecture', `HTTP ${status}`);
  const ip = body.settings?.ipConfiguration || {};
  const sauvegarde = body.settings?.backupConfiguration || {};
  return [
    ip.ipv4Enabled
      ? bloc('exposition', 'Exposition de la base', 'alerte', 'une IPv4 publique est activée sur l’instance', 'ipConfiguration.ipv4Enabled = true')
      : bloc('exposition', 'Exposition de la base', 'ok', 'aucune IPv4 publique, accès par le réseau privé', ip.privateNetwork ? `réseau ${ip.privateNetwork.split('/').pop()}` : ''),
    sauvegarde.enabled
      ? bloc('sauvegardes', 'Sauvegardes et PITR', 'ok', `sauvegardes automatiques activées, PITR ${sauvegarde.pointInTimeRecoveryEnabled ? 'activé' : 'désactivé'}`, `${sauvegarde.backupRetentionSettings?.retainedBackups ?? '?'} sauvegardes conservées`)
      : bloc('sauvegardes', 'Sauvegardes et PITR', 'inconnu', 'sauvegardes automatiques désactivées'),
    bloc('disponibilite', 'Disponibilité', 'ok', body.settings?.availabilityType === 'REGIONAL' ? 'HA régionale, standby dans une autre zone' : 'instance zonale, dans une seule zone', `${body.databaseVersion}, ${body.settings?.tier}, ${body.gceZone || body.region}`),
  ];
}

export const carteDeploiement = enCache(async () => {
  let erreur = null;
  try {
    await (await stockage()).etat();
  } catch (error) {
    erreur = error;
  }
  return {
    plateforme: local ? 'local' : 'Cloud Run',
    blocs: [
      await blocEntree(),
      blocCloudRun('API sur Cloud Run'),
      await blocIdentite(),
      await blocSecret(),
      ...blocsConnexion(erreur),
      ...(await blocsInstance()),
      bloc('obs', 'Logging et Monitoring', 'manuel', 'dashboard, alerte et test de restauration : invisibles depuis l’application, montrez-les'),
    ],
  };
});

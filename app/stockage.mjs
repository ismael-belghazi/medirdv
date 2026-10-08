// Accès aux données de MediRdv. Trois modes, choisis par les variables d'environnement :
//   connecteur  INSTANCE_CONNECTION_NAME défini : Cloud SQL en IP privée via le connecteur Node.js
//               (l'identité du service a besoin de roles/cloudsql.client, l'API Cloud SQL Admin doit être active)
//   direct      DB_HOST défini : connexion PostgreSQL classique, utilisée par le docker compose local
//   memoire     DB_MODE=memoire : aucune base, pour essayer l'interface sans rien installer
import fs from 'node:fs';
import { appelGoogle } from './gcp.mjs';

const fictifs = [
  ['Patient fictif 1', 'Dr Exemple', 1, 9],
  ['Patient fictif 2', 'Dr Exemple', 1, 10],
  ['Patient fictif 3', 'Dr Démo', 2, 14],
  ['Patient fictif 4', 'Dr Démo', 3, 11],
  ['Patient fictif 5', 'Dr Exemple', 4, 16],
];
const fictif = ([patient, praticien, jours, heure]) => {
  const debut = new Date();
  debut.setDate(debut.getDate() + jours);
  debut.setHours(heure, 0, 0, 0);
  return { patient, praticien, debut: debut.toISOString() };
};

// Le mot de passe a trois sources possibles :
//   DB_PASSWORD_SECRET  le service lit lui-même la version du secret dans Secret Manager, avec son identité
//   DB_PASSWORD_FILE    un fichier : Cloud Run sait y monter un secret, le compose local fait de même
//   DB_PASSWORD         une variable, injectée par Cloud Run depuis Secret Manager ou écrite en clair
export function sourceMotDePasse(env = process.env) {
  if (env.DB_PASSWORD_SECRET) return 'secret';
  if (env.DB_PASSWORD_FILE) return 'fichier';
  if (env.DB_PASSWORD) return 'variable';
  return 'aucune';
}

export async function lireSecret(nom = process.env.DB_PASSWORD_SECRET) {
  const { status, body } = await appelGoogle(`https://secretmanager.googleapis.com/v1/${nom}:access`);
  if (status !== 200) throw Object.assign(new Error(`lecture du secret refusée (HTTP ${status || 'hors GCP'})`), { code: status === 403 ? 'PERMISSION_DENIED' : `SECRET_${status}` });
  return Buffer.from(body.payload.data, 'base64').toString('utf8').trim();
}

async function motDePasse() {
  const source = sourceMotDePasse();
  if (source === 'secret') return lireSecret();
  if (source === 'fichier') return fs.readFileSync(process.env.DB_PASSWORD_FILE, 'utf8').trim();
  return process.env.DB_PASSWORD;
}

export function choisirMode(env = process.env) {
  if (env.DB_MODE === 'memoire') return 'memoire';
  if (env.INSTANCE_CONNECTION_NAME) return 'connecteur';
  if (env.DB_HOST) return 'direct';
  return 'non configuré';
}

function stockageMemoire() {
  let id = 0;
  const rendezVous = fictifs.map(fictif).map((rdv) => ({ id: ++id, ...rdv, cree_le: new Date().toISOString() }));
  const reperes = [];
  let derniereEcriture = null;
  const ecrit = () => { derniereEcriture = new Date().toISOString(); };
  return {
    async lister() { return [...rendezVous].sort((a, b) => a.debut.localeCompare(b.debut)); },
    async creer(rdv) { const ligne = { id: ++id, ...rdv, cree_le: new Date().toISOString() }; rendezVous.push(ligne); ecrit(); return ligne; },
    async supprimer(cible) { const i = rendezVous.findIndex((rdv) => rdv.id === cible); if (i >= 0) rendezVous.splice(i, 1); ecrit(); return i >= 0; },
    async poserRepere(note) { const ligne = { id: reperes.length + 1, note, cree_le: new Date().toISOString() }; reperes.unshift(ligne); ecrit(); return ligne; },
    async reperes() { return reperes.slice(0, 20); },
    async limiter(max) { rendezVous.sort((a, b) => b.id - a.id).splice(max); reperes.splice(max); },
    async etat() {
      return { latence_ms: 0, pool: null, compteurs: { rendez_vous: rendezVous.length, reperes: reperes.length }, derniere_ecriture: derniereEcriture };
    },
  };
}

async function stockagePostgres(mode) {
  const { default: pg } = await import('pg');
  let options = { host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432) };
  let connector = null;
  if (mode === 'connecteur') {
    const { Connector } = await import('@google-cloud/cloud-sql-connector');
    connector = new Connector();
    options = await connector.getOptions({ instanceConnectionName: process.env.INSTANCE_CONNECTION_NAME, ipType: 'PRIVATE' });
  }
  const max = Number(process.env.POOL_MAX || 5);
  const pool = new pg.Pool({
    ...options,
    user: process.env.DB_USER,
    // Une fonction plutôt qu'une valeur : le mot de passe est relu à chaque nouvelle connexion.
    password: motDePasse,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    max,
    connectionTimeoutMillis: 5000,
  });
  // Une connexion inactive coupée (bascule, redémarrage) ne doit pas arrêter le processus.
  pool.on('error', (error) => console.log(JSON.stringify({ severity: 'ERROR', message: error.message, code: error.code })));

  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS rendez_vous (
      id SERIAL PRIMARY KEY, patient TEXT NOT NULL, praticien TEXT NOT NULL,
      debut TIMESTAMPTZ NOT NULL, cree_le TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS reperes (
      id SERIAL PRIMARY KEY, note TEXT NOT NULL, cree_le TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp())`);
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM rendez_vous');
    if (rows[0].n === 0 && process.env.SEED_DEMO !== 'false') {
      for (const rdv of fictifs.map(fictif)) {
        await pool.query('INSERT INTO rendez_vous (patient, praticien, debut) VALUES ($1, $2, $3)', [rdv.patient, rdv.praticien, rdv.debut]);
      }
    }
  } catch (error) {
    await pool.end().catch(() => {});
    connector?.close();
    throw error;
  }

  return {
    async lister() {
      return (await pool.query('SELECT id, patient, praticien, debut, cree_le FROM rendez_vous ORDER BY debut LIMIT 100')).rows;
    },
    async creer({ patient, praticien, debut }) {
      const sql = 'INSERT INTO rendez_vous (patient, praticien, debut) VALUES ($1, $2, $3) RETURNING id, patient, praticien, debut, cree_le';
      return (await pool.query(sql, [patient, praticien, debut])).rows[0];
    },
    async supprimer(id) {
      return (await pool.query('DELETE FROM rendez_vous WHERE id = $1', [id])).rowCount > 0;
    },
    async poserRepere(note) {
      return (await pool.query('INSERT INTO reperes (note) VALUES ($1) RETURNING id, note, cree_le', [note])).rows[0];
    },
    async reperes() {
      return (await pool.query('SELECT id, note, cree_le FROM reperes ORDER BY id DESC LIMIT 20')).rows;
    },
    // Démo publique : seules les lignes les plus récentes sont gardées.
    async limiter(max) {
      await pool.query('DELETE FROM rendez_vous WHERE id NOT IN (SELECT id FROM rendez_vous ORDER BY id DESC LIMIT $1)', [max]);
      await pool.query('DELETE FROM reperes WHERE id NOT IN (SELECT id FROM reperes ORDER BY id DESC LIMIT $1)', [max]);
    },
    async etat() {
      const debut = performance.now();
      const { rows: [ligne] } = await pool.query(`SELECT
        (SELECT count(*)::int FROM rendez_vous) AS rendez_vous,
        (SELECT count(*)::int FROM reperes) AS reperes,
        greatest((SELECT max(cree_le) FROM rendez_vous), (SELECT max(cree_le) FROM reperes)) AS derniere_ecriture`);
      return {
        latence_ms: Math.round(performance.now() - debut),
        pool: { total: pool.totalCount, inactives: pool.idleCount, en_attente: pool.waitingCount, max },
        compteurs: { rendez_vous: ligne.rendez_vous, reperes: ligne.reperes },
        derniere_ecriture: ligne.derniere_ecriture,
      };
    },
    async fermer() {
      await pool.end();
      connector?.close();
    },
  };
}

// La connexion s'ouvre à la première demande et se retente ensuite : le service démarre même si la
// base est injoignable, et l'erreur exacte apparaît dans les journaux et dans l'interface.
let enCours = null;
export function stockage() {
  const mode = choisirMode();
  enCours ??= (async () => {
    if (mode === 'memoire') return stockageMemoire();
    if (mode === 'non configuré') throw Object.assign(new Error('définissez DB_HOST, INSTANCE_CONNECTION_NAME ou DB_MODE=memoire'), { code: 'CONFIG' });
    for (const nom of ['DB_NAME', 'DB_USER']) {
      if (!process.env[nom]) throw Object.assign(new Error(`variable ${nom} manquante`), { code: 'CONFIG' });
    }
    return stockagePostgres(mode);
  })().catch((error) => {
    enCours = null;
    throw error;
  });
  return enCours;
}

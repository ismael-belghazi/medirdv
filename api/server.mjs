// API et agenda de démonstration pour MediRdv, à déployer sur Cloud Run.
// Données fictives uniquement. La configuration de la base est décrite dans stockage.mjs.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import { stockage, choisirMode } from './stockage.mjs';
import { carteDeploiement } from './deploiement.mjs';

const here = new URL('.', import.meta.url);
const version = process.env.APP_VERSION || 'dev';
const plateforme = process.env.K_SERVICE ? 'Cloud Run' : 'local';
const instance = process.env.K_REVISION || os.hostname();
// Démo publique : les noms sont générés par le serveur et le nombre de lignes est plafonné.
const demoPublique = process.env.DEMO_PUBLIQUE === 'true';
const praticiens = ['Dr Exemple', 'Dr Démo'];
const assets = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/kit.css': ['kit.css', 'text/css; charset=utf-8'],
  '/carte.js': ['carte.js', 'text/javascript; charset=utf-8'],
};

// Chaque code d'erreur est rattaché à la couche qu'il faut vérifier en premier.
function couche(code = '') {
  if (['ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EHOSTUNREACH', 'ECONNRESET'].includes(code)) return 'réseau';
  if (['28P01', '28000'].includes(code)) return 'authentification PostgreSQL';
  if (code === '3D000') return 'base de données absente';
  if (code === 'CONFIG') return 'configuration du service';
  if (/PERMISSION|403|401/.test(code)) return 'IAM';
  return 'à diagnostiquer dans les journaux';
}

function log(severity, message, extra = {}) {
  console.log(JSON.stringify({ severity, message, ...extra }));
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
}

// Le détail de l'erreur reste dans les journaux ; le client ne reçoit que son code et la couche à vérifier.
function indisponible(res, error) {
  const code = String(error.code || error.status || 'INCONNU');
  log('ERROR', error.message, { code });
  send(res, 503, { statut: 'indisponible', code, couche: couche(code) });
}

async function lireJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 10_000) throw Object.assign(new Error('requête trop longue'), { http: 413 });
  }
  try {
    return JSON.parse(body || '{}');
  } catch {
    throw Object.assign(new Error('JSON invalide'), { http: 400 });
  }
}

const texte = (value) => typeof value === 'string' && value.trim().length > 0 && value.length < 200;

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'GET' && assets[pathname]) {
      const [file, type] = assets[pathname];
      return send(res, 200, fs.readFileSync(new URL(`public/${file}`, here)), type);
    }
    if (pathname === '/healthz') return send(res, 200, { statut: 'ok' });

    if (pathname === '/readyz' || pathname === '/api/etat') {
      const base = { plateforme, instance, version, mode: choisirMode(), demo_publique: demoPublique, heure_serveur: new Date().toISOString() };
      try {
        const etat = await (await stockage()).etat();
        return send(res, 200, { ...base, base: { statut: 'ok', ...etat } });
      } catch (error) {
        const code = String(error.code || 'INCONNU');
        log('ERROR', error.message, { code });
        return send(res, pathname === '/readyz' ? 503 : 200, { ...base, base: { statut: 'indisponible', code, couche: couche(code) } });
      }
    }

    if (pathname === '/api/deploiement') return send(res, 200, await carteDeploiement());

    if (pathname === '/api/rendez-vous' && req.method === 'GET') {
      return send(res, 200, await (await stockage()).lister());
    }
    if (pathname === '/api/rendez-vous' && req.method === 'POST') {
      let { patient, praticien, debut } = await lireJson(req);
      if (demoPublique) {
        // Aucune saisie libre en démo publique : personne ne peut y laisser une vraie donnée.
        patient = `Patient fictif ${100 + Math.floor(Math.random() * 900)}`;
        if (!praticiens.includes(praticien)) praticien = praticiens[0];
      }
      if (![patient, praticien, debut].every(texte) || Number.isNaN(Date.parse(debut))) {
        return send(res, 400, { erreur: 'patient, praticien et debut (date ISO) sont requis' });
      }
      const donnees = await stockage();
      const cree = await donnees.creer({ patient: patient.trim(), praticien: praticien.trim(), debut });
      if (demoPublique) await donnees.limiter(40);
      return send(res, 201, cree);
    }
    const suppression = pathname.match(/^\/api\/rendez-vous\/(\d+)$/);
    if (suppression && req.method === 'DELETE') {
      const supprime = await (await stockage()).supprimer(Number(suppression[1]));
      log('NOTICE', `rendez-vous ${suppression[1]} supprimé`);
      return send(res, supprime ? 200 : 404, { supprime });
    }

    // Les repères horodatés servent à mesurer la perte de données lors d'une restauration.
    if (pathname === '/api/reperes' && req.method === 'GET') {
      return send(res, 200, await (await stockage()).reperes());
    }
    if (pathname === '/api/reperes' && req.method === 'POST') {
      const { note } = await lireJson(req);
      const libelle = texte(note) && !demoPublique ? note.trim() : 'repère';
      const donnees = await stockage();
      const repere = await donnees.poserRepere(libelle);
      if (demoPublique) await donnees.limiter(40);
      return send(res, 201, repere);
    }

    send(res, 404, { erreur: 'route inconnue' });
  } catch (error) {
    if (error.http) return send(res, error.http, { erreur: error.message });
    indisponible(res, error);
  }
});

server.listen(Number(process.env.PORT || 8080), () => log('INFO', `API prête sur le port ${server.address().port}, mode ${choisirMode()}`));
process.on('SIGTERM', () => server.close(async () => {
  try { await (await stockage()).fermer?.(); } catch {}
  process.exit(0);
}));

const $ = (selector) => document.querySelector(selector);
const heure = (iso) => (iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' }) : 'aucune');
const modes = { connecteur: 'Connecteur Cloud SQL, IP privée', direct: 'Connexion directe', memoire: 'Mémoire, sans base', 'non configuré': 'Non configuré' };
let compteur = 6;

async function api(path, options = {}) {
  const res = await fetch(path, { cache: 'no-store', headers: { 'Content-Type': 'application/json' }, ...options });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.erreur || `HTTP ${res.status}`), body);
  return body;
}

function alerte(error) {
  if (!error) { $('#alert').hidden = true; return; }
  $('#alert').hidden = false;
  $('#alert').textContent = error.code
    ? `La base ne répond pas (code ${error.code}). Couche à vérifier en premier : ${error.couche}. Le détail est dans les journaux du service.`
    : `Erreur : ${error.message}`;
}

async function etat() {
  try {
    const data = await api('/api/etat');
    $('#env').innerHTML = `<b>${data.plateforme}</b> / ${data.version}`;
    $('#instance').textContent = data.instance;
    $('#db-mode').textContent = modes[data.mode] || data.mode;
    if (data.demo_publique && !$('#form').patient.readOnly) {
      $('#form').patient.readOnly = true;
      $('#form').patient.value = 'nom généré par le serveur';
    }
    const base = data.base;
    if (base.statut !== 'ok') {
      $('#db-status').innerHTML = '<span class="badge err">injoignable</span>';
      alerte(base);
      return;
    }
    alerte(null);
    $('#db-status').innerHTML = '<span class="badge ok">ok</span>';
    $('#db-ms').textContent = `${base.latence_ms} ms`;
    $('#db-rows').textContent = base.compteurs.rendez_vous;
    $('#db-last').textContent = heure(base.derniere_ecriture);
    if (base.pool) {
      const { total, inactives, en_attente: attente, max } = base.pool;
      $('#pool-text').textContent = `${total} ouvertes sur ${max}, ${inactives} libres, ${attente} en attente`;
      $('#pool-gauge').style.width = `${Math.min(100, (total / max) * 100)}%`;
    } else {
      $('#pool-text').textContent = 'pas de pool en mode mémoire';
    }
  } catch (error) {
    $('#db-status').innerHTML = '<span class="badge err">erreur</span>';
    alerte(error);
  }
}

async function agenda() {
  try {
    const lignes = await api('/api/rendez-vous');
    const corps = $('#agenda');
    if (!lignes.length) {
      corps.innerHTML = '<tr><td colspan="4" class="muted">Aucun rendez-vous.</td></tr>';
      return;
    }
    corps.replaceChildren(...lignes.map((rdv) => {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td class="jour"></td><td></td><td></td><td><button class="danger">Supprimer</button></td>';
      tr.children[0].textContent = new Date(rdv.debut).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      tr.children[1].textContent = rdv.patient;
      tr.children[2].textContent = rdv.praticien;
      tr.querySelector('button').addEventListener('click', async () => {
        await api(`/api/rendez-vous/${rdv.id}`, { method: 'DELETE' }).catch(alerte);
        rafraichir();
      });
      return tr;
    }));
  } catch (error) {
    alerte(error);
  }
}

async function reperes() {
  try {
    const liste = await api('/api/reperes');
    $('#reperes').replaceChildren(...liste.map((repere) => {
      const li = document.createElement('li');
      li.textContent = `${heure(repere.cree_le)}  ${repere.note}`;
      return li;
    }));
  } catch {}
}

function preparerFormulaire() {
  const form = $('#form');
  if (!form.patient.readOnly) form.patient.value = `Patient fictif ${compteur}`;
  const demain = new Date(Date.now() + 86_400_000);
  demain.setMinutes(0, 0, 0);
  form.debut.value = new Date(demain.getTime() - demain.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

$('#form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  try {
    await api('/api/rendez-vous', { method: 'POST', body: JSON.stringify({ patient: form.patient.value, praticien: form.praticien.value, debut: new Date(form.debut.value).toISOString() }) });
    compteur += 1;
    preparerFormulaire();
  } catch (error) {
    alerte(error);
  }
  rafraichir();
});

$('#repere').addEventListener('click', async () => {
  await api('/api/reperes', { method: 'POST', body: '{}' }).catch(alerte);
  rafraichir();
});

async function carte() {
  try {
    const { blocs } = await api('/api/deploiement');
    Carte.rendre($('#carte'), [
      { titre: 'Entrée', ids: ['entree', 'run', 'identite'] },
      { titre: 'Secret', ids: ['secret'] },
      { titre: 'Réseau', ids: ['vpc'] },
      { titre: 'Base', ids: ['sql', 'exposition', 'sauvegardes', 'disponibilite'] },
      { titre: 'Exploitation', ids: ['obs'] },
    ], blocs);
  } catch {}
}

function rafraichir() {
  etat();
  agenda();
  reperes();
}
preparerFormulaire();
rafraichir();
carte();
setInterval(etat, 3000);
setInterval(carte, 15000);

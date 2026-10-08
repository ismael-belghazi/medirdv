// Carte du déploiement : l'architecture cible, bloc par bloc, colorée selon ce que l'application
// constate elle-même. Chaque bloc montre sa preuve. Ce qui est invisible depuis l'application
// reste « à prouver vous-même », dans la console et les journaux.
window.Carte = (() => {
  const etats = {
    ok: ['prouvé', 'ok'],
    alerte: ['à revoir', 'warn'],
    echec: ['en échec', 'err'],
    inconnu: ['pas encore détecté', ''],
    manuel: ['à prouver vous-même', ''],
    simule: ['simulé en local', 'sim'],
  };

  function rendre(conteneur, rangees, blocs) {
    const parId = new Map(blocs.map((b) => [b.id, b]));
    const lignes = rangees.map(({ titre, ids }) => {
      const rangee = document.createElement('div');
      rangee.className = 'rangee';
      const libelle = document.createElement('span');
      libelle.className = 'rangee-titre';
      libelle.textContent = titre;
      rangee.append(libelle);
      for (const id of ids) {
        const b = parId.get(id);
        if (!b) continue;
        const [texte, classe] = etats[b.etat] || etats.inconnu;
        const carte = document.createElement('div');
        carte.className = `bloc etat-${b.etat}`;
        carte.innerHTML = '<span class="badge"></span><strong></strong><p></p><code></code>';
        carte.children[0].className = `badge ${classe}`;
        carte.children[0].textContent = texte;
        carte.children[1].textContent = b.nom;
        carte.children[2].textContent = b.detail || '';
        if (b.preuve) carte.children[3].textContent = b.preuve;
        else carte.children[3].remove();
        rangee.append(carte);
      }
      return rangee;
    });

    const detectables = blocs.filter((b) => b.etat !== 'manuel');
    const prouves = detectables.filter((b) => b.etat === 'ok').length;
    const resume = document.createElement('div');
    resume.className = 'carte-resume';
    if (detectables.length && detectables.every((b) => b.etat === 'simule')) {
      resume.textContent = 'En local, tous les blocs sont simulés. Une fois déployée sur GCP, la carte s’allume bloc par bloc.';
    } else {
      resume.innerHTML = '<span></span><div class="gauge"><span></span></div>';
      resume.firstChild.textContent = `${prouves} bloc${prouves > 1 ? 's' : ''} prouvé${prouves > 1 ? 's' : ''} sur ${detectables.length} détectables`;
      resume.querySelector('.gauge span').style.width = `${detectables.length ? (prouves / detectables.length) * 100 : 0}%`;
    }
    conteneur.replaceChildren(resume, ...lignes);
  }

  return { rendre };
})();

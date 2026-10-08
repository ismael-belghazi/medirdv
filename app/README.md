# MediRdv, kit de démarrage

Une API de rendez-vous fictifs avec son agenda, prête à tourner sur Cloud Run et à rejoindre Cloud SQL en IP privée. L’interface montre aussi ce que voit l’infrastructure : le mode de connexion, la latence de la base, le remplissage du pool et la couche à vérifier quand quelque chose casse. Le kit est un démonstrateur : il sert à vérifier votre infrastructure, il n’est pas évalué.

N’utilisez que des données fictives, ici comme dans le laboratoire.

## Ce qu’il contient

```text
api/                  Le code à déployer sur Cloud Run
  server.mjs          Routes de l’API et de l’interface
  stockage.mjs        Accès à PostgreSQL : connecteur Cloud SQL, connexion directe ou mémoire
  public/             Interface : agenda, état de la connexion, repères horodatés
  package.json, package-lock.json, Dockerfile
docker-compose.yml    PostgreSQL et l’API, pour travailler en local
```

## Lancer en local

Avec Docker :

```sh
docker compose up --build
```

Puis ouvrez http://localhost:8080. La base démarre avec cinq rendez-vous fictifs.

Sans Docker ni base, pour voir l’interface seulement :

```sh
cd api
npm install
npm run demo
```

| Rôle | En local | Sur GCP |
| --- | --- | --- |
| Base de données | conteneur `base`, PostgreSQL sans port publié | Cloud SQL PostgreSQL sans IP publique |
| Chemin vers la base | réseau interne de Docker | Sortie VPC de Cloud Run et Private Service Access |
| Mot de passe | fichier monté depuis une config Compose | secret Secret Manager, monté comme fichier ou injecté en variable |
| API et interface | conteneur `api` | Cloud Run, avec son identité dédiée |

Pour voir l’interface réagir à une panne, arrêtez la base avec `docker compose stop base` : l’agenda affiche le code d’erreur et la couche à vérifier. `docker compose start base` rétablit tout.

## Passer sur GCP

Le code d’`api/` se déploie tel quel. Le réseau, la base, le secret, les identités et le service Cloud Run, c’est vous qui les écrivez en Terraform.

```sh
REGION=europe-west9
PROJECT_ID=votre-projet
IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/medirdv/api:v1"
gcloud builds submit --tag "$IMAGE" api
gcloud artifacts docker images describe "$IMAGE" --format='value(image_summary.digest)'
```

Le service attend ces variables sur Cloud Run :

| Variable | Rôle |
| --- | --- |
| `INSTANCE_CONNECTION_NAME` | `projet:region:instance`. Active le connecteur Cloud SQL en IP privée. |
| `DB_NAME`, `DB_USER` | Base et utilisateur applicatif, qui n’est pas un superutilisateur. |
| `DB_PASSWORD_FILE` ou `DB_PASSWORD` | Le mot de passe, fourni par Secret Manager. Jamais dans le code ni dans Terraform en clair. |
| `POOL_MAX` | Connexions maximales par instance, 5 par défaut. À multiplier par le nombre d’instances pour comparer à la limite de la base. |
| `APP_VERSION` | Version affichée dans l’interface. |
| `SEED_DEMO` | Mettre `false` pour ne pas créer les cinq rendez-vous de départ. |

Le connecteur appelle l’API Cloud SQL Admin : elle doit être activée, et l’identité du service a besoin de `roles/cloudsql.client`. Ce rôle ne crée pas de chemin réseau ; sans sortie VPC vers le réseau de la base, la connexion échoue avec une erreur réseau, et l’interface vous le dit.

Si le mot de passe est injecté en variable, il est lu au démarrage de l’instance : retirer l’accès au secret ne se voit qu’avec une nouvelle révision. Monté comme fichier, il est relu à chaque nouvelle connexion.

## Routes

| Route | Rôle |
| --- | --- |
| `GET /` | Interface |
| `GET /healthz` | Le processus tourne |
| `GET /readyz` | La base répond (503 sinon, avec le code d’erreur) |
| `GET /api/etat` | Mode, latence, pool, compteurs, dernière écriture |
| `GET, POST /api/rendez-vous` | Lire et créer des rendez-vous fictifs |
| `DELETE /api/rendez-vous/:id` | Supprimer, pour simuler l’erreur à rattraper |
| `GET, POST /api/reperes` | Repères horodatés pour mesurer le RPO |

## La carte du déploiement

En haut de l’interface, l’architecture cible est dessinée bloc par bloc. Chaque bloc s’allume selon ce que l’application constate elle-même, avec la preuve affichée dessous :

| Couleur | Sens |
| --- | --- |
| vert, « prouvé » | l’application l’a vérifié elle-même |
| orange, « à revoir » | ça fonctionne, mais c’est un anti-pattern connu |
| rouge, « en échec » | l’application a essayé et ça ne marche pas |
| pointillés, « pas encore détecté » | rien de visible pour l’instant |
| gris, « à prouver vous-même » | invisible depuis l’application : montrez-le dans la console |
| violet, « simulé en local » | l’équivalent local, en attendant le déploiement |

La carte constate, elle ne note pas : un bloc vert ne dit pas que votre choix est le bon, seulement qu’il est en place.

Pour MediRdv, le service lit lui-même :

| Bloc | Comment | Droit nécessaire |
| --- | --- | --- |
| Entrée du service | configuration Cloud Run : ingress et invocation publique ou non | `roles/run.viewer` sur le service, facultatif |
| Identité | serveur de métadonnées | aucun |
| Secret Manager | lecture du secret, si `DB_PASSWORD_SECRET` est utilisé | `roles/secretmanager.secretAccessor`, déjà nécessaire |
| Réseau et base | résultat de la connexion, avec la couche en cause | aucun |
| Exposition, sauvegardes, disponibilité | configuration de l’instance par l’API Cloud SQL Admin | couvert par `roles/cloudsql.client` |

Avec `DB_PASSWORD_SECRET=projects/PROJET/secrets/NOM/versions/latest`, le service lit le mot de passe directement dans Secret Manager à chaque nouvelle connexion : retirez-lui le droit d’accès et le bloc passe au rouge dans les secondes qui suivent.

## Démo publique

Avec `DEMO_PUBLIQUE=true`, le nom du patient est généré par le serveur et le nombre de lignes est plafonné à quarante. C’est le réglage des démos hébergées sur la VM du cours.

# Module Network

Le module `network` gère le réseau privé Google Cloud utilisé par l'infrastructure MediRDV.

## Objectif

Créer un réseau permettant aux différents services de communiquer de manière privée et sécurisée.

```text
Cloud Run
    │
    ▼
VPC privé
    │
    ├── Subnet
    │
    └── Private Service Access
              │
              ▼
        Cloud SQL PostgreSQL
````

 ## Structure

```
network/
├── main.tf
├── variables.tf
└── outputs.tf
```

 ## `main.tf`

 Le fichier `main.tf` configure :

 - le VPC ;
- le subnet ;
- Private Service Access ;
- la plage d'adresses IP privées réservée aux services Google.

 ## VPC

 Le VPC est créé sans sous-réseaux automatiques :

```
auto_create_subnetworks = false
```

 Les subnets sont donc créés explicitement afin de garder le contrôle sur l'adressage réseau.

```
VPC
 │
 └── medirdv-subnet
```

 ## Subnet

 Le module crée un subnet privé pour les ressources de l'application.

 Exemple :

```
Nom    : medirdv-subnet
CIDR   : 10.10.0.0/24
Région : europe-west1
```

 L'accès privé aux services Google est activé :

```
private_ip_google_access = true
```

 ## Private Service Access

 Private Service Access permet à Cloud SQL d'être accessible depuis le VPC avec une adresse IP privée.

 Le module réserve une plage IP dédiée :

```
VPC
 │
 ▼
Plage IP privée
 │
 ▼
Private Service Access
 │
 ▼
Cloud SQL
```

 La communication avec Cloud SQL ne nécessite donc pas d'adresse IP publique.

 ## Sécurité réseau

 Le réseau est conçu pour limiter l'exposition des ressources :

 - VPC personnalisé ;
- subnet défini manuellement ;
- Cloud SQL sans IP publique ;
- communication privée avec Cloud SQL ;
- Private Service Access ;
- contrôle des plages IP.

 ## `variables.tf`

 Le fichier `variables.tf` définit les paramètres du réseau :

 - `project_id` : projet Google Cloud ;
- `region` : région du subnet ;
- `network_name` : nom du VPC ;
- `subnet_name` : nom du subnet ;
- `subnet_cidr` : plage IP du subnet.

 ## `outputs.tf`

 Le module retourne les informations utilisées par les autres modules :

```
network_id
network_name
subnet_id
subnet_name
```

 Ces valeurs sont notamment utilisées par les modules `database` et `application`.

 ## Dépendances

 Le réseau est créé en premier car les autres ressources en dépendent.

```
Network
   │
   ├──────────► Database
   │
   └──────────► Application
```

 Le module `database` utilise le VPC pour son accès privé.

 Le module `application` utilise le VPC et le subnet pour accéder aux ressources privées.

 ## Utilisation

 Le module est appelé depuis le `main.tf` à la racine :

```
module "network" {
  source = "./modules/network"

  project_id   = var.project_id
  region       = var.region
  network_name = var.network_name
  subnet_name  = var.subnet_name
  subnet_cidr  = var.subnet_cidr
}
```

 ## Déploiement

 Le module est déployé avec l'infrastructure globale :

```
terraform plan
terraform apply
```
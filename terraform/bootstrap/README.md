# Bootstrap Terraform

Le dossier `bootstrap` sert à créer les ressources nécessaires au fonctionnement du backend Terraform avant le déploiement de l'infrastructure principale.

## Objectif

Le bootstrap crée un bucket **Google Cloud Storage (GCS)** utilisé pour stocker le **Terraform State**.

```
Bootstrap
    │
    ▼
Google Cloud Storage
    │
    ▼
Terraform State
````

 Le Terraform State permet à Terraform de suivre les ressources qu'il crée et de connaître leur état actuel.

 ## Structure

 Le bootstrap est volontairement minimaliste :

```
bootstrap/
└── main.tf
```

 Toute la configuration est contenue dans le fichier [`main.tf`](./main.tf)

 ## Configuration

 Le fichier `main.tf` contient :

 - la version minimale de Terraform ;
- le provider Google Cloud ;
- le projet GCP ;
- la région ;
- la variable `project_id` ;
- la variable `region` ;
- le bucket GCS utilisé pour le Terraform State ;
- le versioning du bucket ;
- l'accès uniforme au bucket ;
- l'output contenant le nom du bucket.

 ### Version de Terraform

```
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}
```

 Le projet nécessite Terraform `1.6.0` ou une version supérieure et utilise le provider Google en version `6.x`.

 ### Provider Google Cloud

```
provider "google" {
  project = var.project_id
  region  = var.region
}
```

 Le provider utilise le projet et la région définis dans les variables Terraform.

 ### Variables

 Le projet GCP est défini avec la variable `project_id` :

```
variable "project_id" {
  type = string
}
```

 La région possède une valeur par défaut :

```
variable "region" {
  type    = string
  default = "europe-west1"
}
```

 La région peut donc être modifiée lors de l'exécution de Terraform si nécessaire.

 ### Bucket Terraform State

 Le bucket GCS est créé avec la ressource :

```
resource "google_storage_bucket" "terraform_state" {
  project  = var.project_id
  name     = "${var.project_id}-terraform-state"
  location = var.region

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }
}
```

 Le nom du bucket est automatiquement construit à partir de l'ID du projet :

```
TON_PROJECT_ID-terraform-state
```

 Le **versioning** est activé afin de conserver plusieurs versions des fichiers stockés dans le bucket.

 L'option :

```
uniform_bucket_level_access = true
```

 active la gestion uniforme des accès au niveau du bucket.

 ### Output

 Le nom du bucket est exposé avec :

```
output "bucket_name" {
  value = google_storage_bucket.terraform_state.name
}
```

 Cela permet de récupérer facilement le nom du bucket après son déploiement.

 ## Déploiement

 Depuis le dossier `bootstrap` :

```
cd bootstrap
```

 Initialiser Terraform :

```
terraform init
```

 Vérifier la configuration :

```
terraform validate
```

 Créer le bucket :

```
terraform apply -var="project_id=TON_PROJECT_ID"
```

 Terraform va alors créer :

```
TON_PROJECT_ID-terraform-state
```

 dans la région `europe-north1` par défaut.

 ## Backend du projet principal

 Une fois le bucket créé, il peut être utilisé comme backend GCS pour l'infrastructure principale.

 Exemple :

```
terraform {
  backend "gcs" {
    bucket = "TON_PROJECT_ID-terraform-state"
    prefix = "medirdv"
  }
}
```

 Le bootstrap doit être exécuté **avant** l'initialisation du projet principal avec ce backend.

 L'ordre est donc :

```
1. bootstrap
      │
      ▼
2. Création du bucket GCS
      │
      ▼
3. Configuration du backend GCS
      │
      ▼
4. terraform init
      │
      ▼
5. Déploiement de l'infrastructure
```

 ## Suppression

 Le bucket contient le Terraform State de l'infrastructure principale.

 Il ne doit donc **pas être supprimé tant qu'il est utilisé comme backend Terraform**.

 La commande suivante doit être utilisée avec précaution :

```
terraform destroy
```

>Attention: une suppression du bucket peut entraîner la perte du Terraform State et empêcher Terraform de gérer correctement les ressources existantes.

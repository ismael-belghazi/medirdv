variable "project_id" {
  description = "ID du projet Google Cloud"
  type        = string
}

variable "region" {
  description = "Région GCP"
  type        = string
  default     = "europe-west1"
}

variable "zone" {
  description = "Zone GCP"
  type        = string
  default     = "europe-west1-b"
}

variable "network_name" {
  description = "Nom du VPC"
  type        = string
  default     = "medirdv-vpc"
}

variable "subnet_frontend_name" {
  type = string
}
variable "subnet_frontend_cidr" {
  type = string
}
variable "subnet_bastion_name" {
  type = string
}
variable "subnet_bastion_cidr" {
  type = string
}

variable "database_private_ip" {
  type        = string
  description = "Private IP address of the database"
}

variable "database_name" {
  description = "Nom de la base PostgreSQL"
  type        = string
  default     = "medirdv"
}

variable "database_user" {
  description = "Utilisateur PostgreSQL"
  type        = string
  default     = "medirdv-app"
}

variable "cloud_run_name" {
  description = "Nom du service Cloud Run"
  type        = string
  default     = "medirdv"
}

variable "container_image" {
  description = "Image Docker de l'application"
  type        = string
}

variable "ssh_public_keys" {
  description = "Liste des clés SSH publiques autorisées"
  type        = list(string)
  sensitive   = false
}



variable "vms" {
  description = "VMs à créer"
  type = map(object({
    subnetwork = string
    network_ip = string
    tags       = list(string)
    public_ip  = bool
    startup    = string
  }))
}

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

variable "subnet_name" {
  description = "Nom du subnet"
  type        = string
  default     = "medirdv-subnet"
}

variable "subnet_cidr" {
  description = "CIDR du subnet"
  type        = string
  default     = "10.10.0.0/24"
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

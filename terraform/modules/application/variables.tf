variable "project_id" {
  description = "ID du projet Google Cloud"
  type        = string
}

variable "region" {
  description = "Région Cloud Run"
  type        = string
}

variable "cloud_run_name" {
  description = "Nom du service Cloud Run"
  type        = string
}

variable "container_image" {
  description = "Image Docker de l'application"
  type        = string
}

variable "network_id" {
  description = "ID du VPC"
  type        = string
}

variable "subnet_id" {
  description = "ID du subnet"
  type        = string
}

variable "database_host" {
  description = "Adresse IP privée de Cloud SQL"
  type        = string
}

variable "database_name" {
  description = "Nom de la base PostgreSQL"
  type        = string
}

variable "database_user" {
  description = "Utilisateur PostgreSQL"
  type        = string
}

variable "database_secret" {
  description = "Nom du secret contenant le mot de passe PostgreSQL"
  type        = string
}

variable "instance_connection_name" {
  description = "Nom de connexion de l'instance Cloud SQL"
  type        = string
}
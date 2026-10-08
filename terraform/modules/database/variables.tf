variable "project_id" {
  description = "ID du projet Google Cloud"
  type        = string
}

variable "region" {
  description = "Région Cloud SQL"
  type        = string
}

variable "network_id" {
  description = "VPC network ID used by Cloud SQL"
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

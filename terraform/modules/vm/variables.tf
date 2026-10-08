variable "project_id" {
  description = "ID du projet GCP"
  type        = string
}

variable "name" {
  description = "Nom de la VM"
  type        = string
}

variable "machine_type" {
  description = "Type de machine"
  type        = string
  default     = "e2-medium"
}

variable "zone" {
  description = "Zone de la VM"
  type        = string
}

variable "subnetwork" {
  description = "Subnet de la VM"
  type        = string
}

variable "network_ip" {
  description = "Adresse IP privée"
  type        = string
  default     = ""
}

variable "instance_tags" {
  description = "Tags réseau"
  type        = list(string)
  default     = []
}

variable "public_ip" {
  description = "Attribuer une IP publique"
  type        = bool
  default     = false
}

variable "ssh_public_keys" {
  description = "Clés SSH publiques autorisées"
  type        = list(string)
}


variable "startup_script" {
  description = "Script de démarrage"
  type        = string
  default     = ""
}

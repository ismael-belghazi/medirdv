variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "network_name" {
  type = string
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

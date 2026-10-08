output "cloud_run_url" {
  description = "URL de l'application Cloud Run"
  value       = module.application.url
}

output "cloud_run_service_account" {
  description = "Service Account utilisé par Cloud Run"
  value       = module.application.service_account
}

output "vpc_id" {
  description = "ID du VPC"
  value       = module.network.network_id
}

output "subnet_frontend_id" {
  description = "ID du subnet frontend"
  value       = module.network.subnet_frontend_id
}

output "subnet_bastion_id" {
  description = "ID du subnet bastion"
  value       = module.network.subnet_bastion_id
}
output "cloud_sql_private_ip" {
  description = "IP privée de Cloud SQL"
  value       = module.database.private_ip
}

output "cloud_sql_instance" {
  description = "Nom de l'instance Cloud SQL"
  value       = module.database.instance_name
}

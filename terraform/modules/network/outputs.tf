output "network_id" {
  value       = google_compute_network.vpc.id
  description = "L'ID du VPC"
}

output "network_name" {
  value       = google_compute_network.vpc.name
  description = "Le nom du VPC"
}

output "subnet_frontend_id" { 
  value = google_compute_subnetwork.subnet_frontend.id 
  }

output "subnet_bastion_id" { 
  value = google_compute_subnetwork.subnet_bastion.id 
  }
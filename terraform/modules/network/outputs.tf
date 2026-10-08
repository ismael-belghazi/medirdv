output "network_id" {
  value       = google_compute_network.vpc.id
  description = "L'ID du VPC"
}

output "network_name" {
  value       = google_compute_network.vpc.name
  description = "Le nom du VPC"
}

output "subnet_id" {
  value       = google_compute_subnetwork.subnet.id
  description = "L'ID du sous-réseau principal"
}

output "subnet_name" {
  value       = google_compute_subnetwork.subnet.name
  description = "Le nom du sous-réseau principal"
}
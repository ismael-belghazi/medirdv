resource "google_compute_network" "vpc" {
  project = var.project_id
  name    = var.network_name

  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  project = var.project_id
  region  = var.region

  name          = var.subnet_name
  network       = google_compute_network.vpc.id
  ip_cidr_range = var.subnet_cidr

  private_ip_google_access = true
}

resource "google_compute_global_address" "private_service_range" {
  project = var.project_id

  name          = "medirdv-private-service-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16

  network = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "private_service_access" {
  network = google_compute_network.vpc.id
  service = "servicenetworking.googleapis.com"

  reserved_peering_ranges = [
    google_compute_global_address.private_service_range.name
  ]
}

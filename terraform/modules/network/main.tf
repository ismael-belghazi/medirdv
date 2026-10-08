resource "google_compute_network" "vpc" {
  project                 = var.project_id
  name                    = var.network_name
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
  mtu                     = 1460
}

resource "google_compute_subnetwork" "subnet" {
  project                  = var.project_id
  region                   = var.region
  name                     = var.subnet_name
  network                  = google_compute_network.vpc.id
  ip_cidr_range            = var.subnet_cidr
  private_ip_google_access = true
}

resource "google_compute_global_address" "private_service_range" {
  project       = var.project_id
  name          = "medirdv-private-service-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "private_service_access" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_service_range.name]
}



resource "google_compute_firewall" "allow_iap_ssh_bastion" {
  project   = var.project_id
  name      = "allow-iap-ssh-bastion"
  network   = google_compute_network.vpc.id
  priority  = 1000
  direction = "INGRESS"

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }
  source_ranges = ["35.235.240.0/20"]
  target_tags   = ["bastion"]
}


resource "google_compute_firewall" "allow_internet_to_frontend" {
  project   = var.project_id
  name      = "allow-internet-to-frontend"
  network   = google_compute_network.vpc.id
  priority  = 1000
  direction = "INGRESS"

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }
  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["frontend"]
}


resource "google_compute_firewall" "allow_ssh_bastion_to_frontend" {
  project   = var.project_id
  name      = "allow-ssh-bastion-to-frontend"
  network   = google_compute_network.vpc.id
  priority  = 1100
  direction = "INGRESS"

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }
  source_tags = ["bastion"]
  target_tags = ["frontend"]
}


resource "google_compute_firewall" "deny_frontend_to_database_all" {
  project   = var.project_id
  name      = "deny-frontend-to-database-all"
  network   = google_compute_network.vpc.id
  priority  = 2000
  direction = "EGRESS"

  deny {
    protocol = "all"
  }
  destination_ranges = ["10.160.80.3"]
  target_tags        = ["frontend"]
}


resource "google_compute_firewall" "allow_api_frontend_to_database" {
  project   = var.project_id
  name      = "allow-api-frontend-to-database"
  network   = google_compute_network.vpc.id
  priority  = 1000
  direction = "EGRESS"

  allow {
    protocol = "tcp"
    ports    = ["5432"]
  }
  destination_ranges = ["10.160.80.3"]
  target_tags        = ["frontend"]
}
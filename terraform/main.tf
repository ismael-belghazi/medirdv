locals {
  services = [
    "compute.googleapis.com",
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "servicenetworking.googleapis.com",
    "secretmanager.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "artifactregistry.googleapis.com",
  ]
}

resource "google_project_service" "services" {
  for_each = toset(local.services)

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "medirdv" {
  project       = var.project_id
  location      = var.region
  repository_id = "medirdv"
  description   = "MediRDV Docker images"
  format        = "DOCKER"

  depends_on = [
    google_project_service.services
  ]
}

module "network" {
  source = "./modules/network"

  project_id = var.project_id
  region     = var.region

  network_name = var.network_name

  subnet_frontend_name = var.subnet_frontend_name
  subnet_frontend_cidr = var.subnet_frontend_cidr

  subnet_bastion_name = var.subnet_bastion_name
  subnet_bastion_cidr = var.subnet_bastion_cidr

  depends_on = [
    google_project_service.services
  ]
}

module "database" {
  source = "./modules/database"

  project_id = var.project_id
  region     = var.region

  network_id = module.network.network_id

  database_name = var.database_name
  database_user = var.database_user

  depends_on = [
    module.network
  ]
}

module "vm" {
  for_each = var.vms

  source = "./modules/vm"

  project_id = var.project_id

  name         = each.key
  machine_type = "e2-medium"
  zone         = var.zone

  subnetwork = "projects/${var.project_id}/regions/${var.region}/subnetworks/${each.value.subnetwork}"

  network_ip    = each.value.network_ip
  instance_tags = each.value.tags
  public_ip     = each.value.public_ip

  ssh_public_keys = var.ssh_public_keys
  startup_script  = each.value.startup

  depends_on = [
    module.network
  ]
}

module "application" {
  source = "./modules/application"

  project_id = var.project_id
  region     = var.region

  cloud_run_name  = var.cloud_run_name
  container_image = var.container_image

  network_id = module.network.network_id
  subnet_id  = module.network.subnet_frontend_id

  database_host   = module.database.private_ip
  database_name   = module.database.database_name
  database_user   = module.database.database_user
  database_secret = module.database.password_secret

  instance_connection_name = module.database.instance_connection_name

  depends_on = [
    module.database,
    google_artifact_registry_repository.medirdv
  ]
}

module "observability" {
  source = "./modules/observability"

  project_id = var.project_id

  depends_on = [
    google_project_service.services
  ]
}
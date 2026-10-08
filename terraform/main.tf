locals {
  services = [
    "compute.googleapis.com",
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "servicenetworking.googleapis.com",
    "secretmanager.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com"
  ]
}

resource "google_project_service" "services" {
  for_each = toset(local.services)

  project = var.project_id
  service = each.value

  disable_on_destroy = false
}

module "network" {
  source = "./modules/network"

  project_id   = var.project_id
  region       = var.region
  network_name = var.network_name
  subnet_name  = var.subnet_name
  subnet_cidr  = var.subnet_cidr

  depends_on = [
    google_project_service.services
  ]
}

module "database" {
  source = "./modules/database"

  project_id    = var.project_id
  region        = var.region
  network_id    = module.network.network_id
  database_name = var.database_name
  database_user = var.database_user

  depends_on = [
    module.network
  ]
}

module "application" {
  source = "./modules/application"

  project_id      = var.project_id
  region          = var.region
  cloud_run_name  = var.cloud_run_name
  container_image = var.container_image

  network_id = module.network.network_id
  subnet_id  = module.network.subnet_id

  database_host   = module.database.private_ip
  database_name   = module.database.database_name
  database_user   = module.database.database_user
  database_secret = module.database.password_secret

  depends_on = [
    module.database
  ]
}

module "observability" {
  source = "./modules/observability"

  project_id = var.project_id

  depends_on = [
    google_project_service.services
  ]
}

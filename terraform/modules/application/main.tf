resource "google_service_account" "cloud_run" {
  project = var.project_id

  account_id   = "medirdv-cloud-run"
  display_name = "MediRDV Cloud Run"
}

resource "google_project_iam_member" "secret_accessor" {
  project = var.project_id

  role = "roles/secretmanager.secretAccessor"

  member = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_cloud_run_v2_service" "application" {
  project  = var.project_id
  name     = var.cloud_run_name
  location = var.region

  deletion_protection = false

  template {
    service_account = google_service_account.cloud_run.email

    containers {
      image = var.container_image

      env {
        name  = "DB_HOST"
        value = var.database_host
      }

      env {
        name  = "DB_NAME"
        value = var.database_name
      }

      env {
        name  = "DB_USER"
        value = var.database_user
      }

      env {
        name = "DB_PASSWORD"

        value_source {
          secret_key_ref {
            secret  = var.database_secret
            version = "latest"
          }
        }
      }
    }

    vpc_access {
      network_interfaces {
        network    = var.network_id
        subnetwork = var.subnet_id
      }
    }
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }
}

resource "google_cloud_run_v2_service_iam_member" "invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.application.name

  role   = "roles/run.invoker"
  member = "allUsers"
}

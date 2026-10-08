resource "random_password" "database" {
  length  = 32
  special = true
}

resource "google_secret_manager_secret" "database_password" {
  project   = var.project_id
  secret_id = "medirdv-db-password"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "database_password" {
  secret      = google_secret_manager_secret.database_password.id
  secret_data = random_password.database.result
}

resource "google_sql_database_instance" "postgres" {
  project          = var.project_id
  name             = "medirdv-postgres"
  database_version = "POSTGRES_18"
  region           = var.region

  settings {
    tier = "db-f1-micro"

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = var.network_id
    }
  }

  deletion_protection = false
}

resource "google_sql_database" "database" {
  project  = var.project_id
  name     = var.database_name
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "application" {
  project  = var.project_id
  name     = var.database_user
  instance = google_sql_database_instance.postgres.name

  password = random_password.database.result
}

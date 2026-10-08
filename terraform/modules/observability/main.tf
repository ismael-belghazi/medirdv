resource "google_logging_project_sink" "medirdv" {
  project = var.project_id
  name    = "medirdv-logs"

  destination = "logging.googleapis.com/projects/${var.project_id}"

  filter = <<-EOT
    resource.type="cloud_run_revision"
    OR resource.type="cloudsql_database"
  EOT
}

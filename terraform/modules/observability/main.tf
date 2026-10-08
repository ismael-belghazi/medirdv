resource "google_logging_project_sink" "medirdv" {
  project = var.project_id
  name    = "medirdv-logs"

  destination = "logging.googleapis.com/projects/${var.project_id}"

  filter = <<-EOT
    resource.type="cloud_run_revision"
    OR resource.type="cloudsql_database"
  EOT

  # Le sink utilise une identité propre.
  unique_writer_identity = true
}


resource "google_monitoring_alert_policy" "cloud_run_errors" {
  project      = var.project_id
  display_name = "MediRDV - Cloud Run errors"
  combiner     = "OR"

  conditions {
    display_name = "Cloud Run - erreurs HTTP 5xx"

    condition_threshold {
      filter = <<-EOT
        resource.type = "cloud_run_revision"
        metric.type   = "run.googleapis.com/request_count"
        metric.labels.response_code_class = "5xx"
      EOT

      comparison      = "COMPARISON_GT"
      threshold_value = 0
      duration        = "300s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  documentation {
    content = "Cloud Run MediRDV retourne des erreurs HTTP 5xx."
  }

  enabled = true
}


resource "google_monitoring_alert_policy" "cloud_sql_cpu" {
  project      = var.project_id
  display_name = "MediRDV - Cloud SQL CPU"
  combiner     = "OR"

  conditions {
    display_name = "Cloud SQL - CPU élevée"

    condition_threshold {
      filter = <<-EOT
        resource.type = "cloudsql_database"
        metric.type   = "cloudsql.googleapis.com/database/cpu/utilization"
      EOT

      comparison      = "COMPARISON_GT"
      threshold_value = 0.8
      duration        = "300s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  documentation {
    content = "L'utilisation CPU de Cloud SQL MediRDV dépasse 80%."
  }

  enabled = true
}

output "log_sink_name" {
  description = "Nom du Log Sink MediRDV"
  value       = google_logging_project_sink.medirdv.name
}

output "cloud_run_alert_policy" {
  description = "Nom de la politique d'alerte Cloud Run"
  value       = google_monitoring_alert_policy.cloud_run_errors.name
}

output "cloud_sql_alert_policy" {
  description = "Nom de la politique d'alerte Cloud SQL"
  value       = google_monitoring_alert_policy.cloud_sql_cpu.name
}

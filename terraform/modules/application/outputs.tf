output "url" {
  description = "URL de Cloud Run"
  value       = google_cloud_run_v2_service.application.uri
}

output "service_account" {
  description = "Service Account Cloud Run"
  value       = google_service_account.cloud_run.email
}

output "instance_name" {
  value = google_sql_database_instance.postgres.name
}

output "private_ip" {
  value = google_sql_database_instance.postgres.private_ip_address
}

output "database_name" {
  value = google_sql_database.database.name
}

output "database_user" {
  value = google_sql_user.application.name
}

output "password_secret" {
  value = google_secret_manager_secret.database_password.secret_id
}

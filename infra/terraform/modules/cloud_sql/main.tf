variable "project_id" { type = string }
variable "region" { type = string }
variable "environment" { type = string }
variable "network_id" { type = string }
variable "database_name" {
  type = string
  default = "afroid"
}
variable "db_tier" {
  type = string
  default = "db-custom-2-7680"
}
variable "enable_backups" {
  type = bool
  default = true
}

resource "random_password" "db_password" {
  length  = 32
  special = false
}

resource "google_sql_database_instance" "postgres" {
  name             = "afroid-db-${var.environment}"
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier = var.db_tier

    ip_configuration {
      ipv4_enabled = true
      authorized_networks {
        name  = "cloud-run-egress"
        value = "0.0.0.0/0"
      }
    }

    backup_configuration {
      enabled    = var.enable_backups
      start_time = "02:00"
    }
  }

  deletion_protection = var.environment == "prod"
}

resource "google_sql_database" "database" {
  name     = var.database_name
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "app_user" {
  name     = "afroid"
  instance = google_sql_database_instance.postgres.name
  password = random_password.db_password.result
}

output "instance_connection_name" {
  value = google_sql_database_instance.postgres.connection_name
}

output "database_connection_url" {
  value     = "postgresql+asyncpg://${google_sql_user.app_user.name}:${random_password.db_password.result}@${google_sql_database_instance.postgres.ip_address}:5432/${google_sql_database.database.name}"
  sensitive = true
}

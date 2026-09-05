# ==============================================================================
# Cloud SQL Module — PostgreSQL 16 + pgvector (Hardened)
# Private IP only, no public internet exposure
# ==============================================================================

variable "project_id" { type = string }
variable "region" { type = string }
variable "environment" { type = string }
variable "network_id" { type = string }

variable "database_name" {
  type    = string
  default = "afroid"
}

variable "db_tier" {
  type    = string
  default = "db-custom-2-7680"
}

variable "enable_backups" {
  type    = bool
  default = true
}

# --- Private Service Access (VPC Peering for Cloud SQL) ---

resource "google_compute_global_address" "private_ip_range" {
  name          = "afroid-sql-private-${var.environment}"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 20
  network       = var.network_id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = var.network_id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
}

# --- Database Password → Secret Manager ---

resource "random_password" "db_password" {
  length  = 32
  special = false
}

resource "google_secret_manager_secret" "db_password" {
  secret_id = "afroid-db-password-${var.environment}"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = random_password.db_password.result
}

# --- Cloud SQL Instance (Private IP Only) ---

resource "google_sql_database_instance" "postgres" {
  name             = "afroid-db-${var.environment}"
  database_version = "POSTGRES_16"
  region           = var.region

  depends_on = [google_service_networking_connection.private_vpc_connection]

  settings {
    tier = var.db_tier

    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = var.network_id
      enable_private_path_for_google_cloud_services  = true
    }

    database_flags {
      name  = "cloudsql.iam_authentication"
      value = "on"
    }

    backup_configuration {
      enabled                        = var.enable_backups
      start_time                     = "02:00"
      point_in_time_recovery_enabled = var.enable_backups
      transaction_log_retention_days = 7
    }

    maintenance_window {
      day          = 7  # Sunday
      hour         = 3  # 03:00 UTC
      update_track = "stable"
    }

    insights_config {
      query_insights_enabled  = true
      record_application_tags = true
      record_client_address   = false
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

# --- Outputs ---

output "instance_connection_name" {
  value = google_sql_database_instance.postgres.connection_name
}

output "private_ip_address" {
  value = google_sql_database_instance.postgres.private_ip_address
}

output "database_connection_url" {
  value     = "postgresql+asyncpg://${google_sql_user.app_user.name}:${random_password.db_password.result}@${google_sql_database_instance.postgres.private_ip_address}:5432/${google_sql_database.database.name}"
  sensitive = true
}

output "db_password_secret_id" {
  value = google_secret_manager_secret.db_password.secret_id
}

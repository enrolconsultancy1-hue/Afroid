# ==============================================================================
# Cloud Run Module — Hardened (Configurable IAM)
# Public access only for web-facing services; all others require authentication
# ==============================================================================

variable "service_name" { type = string }
variable "region" { type = string }
variable "image" { type = string }

variable "container_port" {
  type    = number
  default = 8080
}

variable "cpu" {
  type    = string
  default = "1"
}

variable "memory" {
  type    = string
  default = "512Mi"
}

variable "min_instances" {
  type    = number
  default = 0
}

variable "max_instances" {
  type    = number
  default = 10
}

variable "vpc_connector_id" { type = string }

variable "env_vars" {
  type    = map(string)
  default = {}
}

variable "secret_env_vars" {
  description = "Environment variables sourced from Secret Manager: name => secret_id"
  type        = map(string)
  default     = {}
}

variable "public_access" {
  description = "If true, grant allUsers invoker role (for web/gateway only)"
  type        = bool
  default     = false
}

variable "service_account_email" {
  description = "Custom service account for the Cloud Run service"
  type        = string
  default     = ""
}

# --- Cloud Run Service ---

resource "google_cloud_run_v2_service" "service" {
  name     = var.service_name
  location = var.region
  ingress  = var.public_access ? "INGRESS_TRAFFIC_ALL" : "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  template {
    service_account = var.service_account_email != "" ? var.service_account_email : null

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    vpc_access {
      connector = var.vpc_connector_id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = var.image

      resources {
        limits = {
          cpu    = var.cpu
          memory = var.memory
        }
      }

      ports {
        container_port = var.container_port
      }

      # Plaintext env vars (non-sensitive only)
      dynamic "env" {
        for_each = var.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      # Secret Manager env vars (sensitive values)
      dynamic "env" {
        for_each = var.secret_env_vars
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }

      startup_probe {
        http_get {
          path = "/health"
          port = var.container_port
        }
        initial_delay_seconds = 5
        timeout_seconds       = 3
        period_seconds        = 10
        failure_threshold     = 3
      }

      liveness_probe {
        http_get {
          path = "/health"
          port = var.container_port
        }
        period_seconds    = 30
        timeout_seconds   = 3
        failure_threshold = 3
      }
    }
  }
}

# --- IAM: Public access only when explicitly enabled ---

resource "google_cloud_run_service_iam_member" "public_invoker" {
  count    = var.public_access ? 1 : 0
  location = google_cloud_run_v2_service.service.location
  service  = google_cloud_run_v2_service.service.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "service_url" {
  value = google_cloud_run_v2_service.service.uri
}

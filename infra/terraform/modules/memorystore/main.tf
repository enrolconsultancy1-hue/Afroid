variable "project_id" { type = string }
variable "region" { type = string }
variable "environment" { type = string }
variable "network_id" { type = string }
variable "memory_size_gb" { type = number; default = 1 }

resource "google_redis_instance" "cache" {
  name           = "afroid-redis-${var.environment}"
  tier           = var.environment == "prod" ? "STANDARD_HA" : "BASIC"
  memory_size_gb = var.memory_size_gb
  region         = var.region

  authorized_network = var.network_id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"
  redis_version      = "REDIS_7_0"
  display_name       = "Afroid Redis Cache and Message Broker"
}

output "redis_host" {
  value = google_redis_instance.cache.host
}

output "redis_connection_url" {
  value     = "redis://${google_redis_instance.cache.host}:${google_redis_instance.cache.port}/0"
  sensitive = true
}

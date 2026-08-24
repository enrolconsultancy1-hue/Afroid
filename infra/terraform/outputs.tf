# ==============================================================================
# Afroid Terraform Outputs
# ==============================================================================

output "cloud_sql_connection_name" {
  value       = module.cloud_sql.instance_connection_name
  description = "Cloud SQL PostgreSQL instance connection string"
}

output "redis_host" {
  value       = module.memorystore.redis_host
  description = "Redis host IP for caching"
}

output "artifact_registry_url" {
  value       = "${var.primary_region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}"
  description = "Google Artifact Registry repository path"
}

output "service_urls" {
  value = {
    for k, v in module.cloud_run_services : k => v.service_url
  }
  description = "Public URLs for all Cloud Run microservices"
}

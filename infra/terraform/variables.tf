# ==============================================================================
# Afroid Terraform Variables
# ==============================================================================

variable "project_id" {
  type        = string
  description = "GCP Project ID for Afroid deployment"
  default     = "afroid-production"
}

variable "primary_region" {
  type        = string
  description = "Primary African GCP region for data sovereignty"
  default     = "africa-south1"
}

variable "environment" {
  type        = string
  description = "Deployment environment: dev, staging, prod"
  default     = "prod"
}

variable "image_tag" {
  type        = string
  description = "Container image tag to deploy"
  default     = "latest"
}

variable "db_tier" {
  type        = string
  description = "Cloud SQL machine type"
  default     = "db-custom-2-7680"
}

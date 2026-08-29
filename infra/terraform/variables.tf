# ==============================================================================
# Afroid Terraform Variables
# ==============================================================================

variable "project_id" {
  type        = string
  description = "GCP Project ID for Afroid deployment"
  default     = "afroid-506916"
}

variable "primary_region" {
  type        = string
  description = "Primary North American GCP region for commercial production (e.g. us-central1), with africa-south1 as regional expansion"
  default     = "us-central1"
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

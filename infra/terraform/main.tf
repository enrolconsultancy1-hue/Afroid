# ==============================================================================
# Afroid Sovereign Platform — Root Terraform Configuration
# Primary Region: africa-south1 (Johannesburg, South Africa)
# ==============================================================================

terraform {
  required_version = ">= 1.8.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.30.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.30.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6.0"
    }
  }

  backend "gcs" {
    bucket = "afroid-terraform-state-prod"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.primary_region
}

provider "google-beta" {
  project = var.project_id
  region  = var.primary_region
}

# --- VPC & Private Networking ---
resource "google_compute_network" "vpc_network" {
  name                    = "afroid-vpc-${var.environment}"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet_africa" {
  name          = "afroid-subnet-${var.primary_region}-${var.environment}"
  ip_cidr_range = "10.10.0.0/20"
  region        = var.primary_region
  network       = google_compute_network.vpc_network.id

  private_ip_google_access = true
}

resource "google_vpc_access_connector" "serverless_connector" {
  name          = "afroid-vpc-conn-${var.environment}"
  region        = var.primary_region
  network       = google_compute_network.vpc_network.name
  ip_cidr_range = "10.8.0.0/28"
  min_instances = 2
  max_instances = 10
}

# --- Artifact Registry ---
resource "google_artifact_registry_repository" "docker_repo" {
  location      = var.primary_region
  repository_id = "afroid-containers"
  description   = "Docker container registry for Afroid microservices"
  format        = "DOCKER"
}

# --- Cloud SQL Module (PostgreSQL 16 + pgvector) ---
module "cloud_sql" {
  source = "./modules/cloud_sql"

  project_id     = var.project_id
  region         = var.primary_region
  environment    = var.environment
  network_id     = google_compute_network.vpc_network.id
  database_name  = "afroid"
  db_tier        = var.db_tier
  enable_backups = var.environment == "prod"
}

# --- Redis Memorystore Module ---
module "memorystore" {
  source = "./modules/memorystore"

  project_id  = var.project_id
  region      = var.primary_region
  environment = var.environment
  network_id  = google_compute_network.vpc_network.id
  memory_size_gb = var.environment == "prod" ? 5 : 1
}

# --- Cloud Run Services ---
locals {
  services = {
    auth = {
      image = "${var.primary_region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/auth:${var.image_tag}"
      port  = 8080
      cpu   = "1"
      memory = "512Mi"
      min_instances = var.environment == "prod" ? 1 : 0
      max_instances = 10
    }
    platform = {
      image = "${var.primary_region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/platform:${var.image_tag}"
      port  = 8080
      cpu   = "1"
      memory = "512Mi"
      min_instances = var.environment == "prod" ? 1 : 0
      max_instances = 10
    }
    orchestrator = {
      image = "${var.primary_region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/orchestrator:${var.image_tag}"
      port  = 8080
      cpu   = "2"
      memory = "2Gi"
      min_instances = var.environment == "prod" ? 1 : 0
      max_instances = 20
    }
    certify = {
      image = "${var.primary_region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/certify:${var.image_tag}"
      port  = 8080
      cpu   = "1"
      memory = "1Gi"
      min_instances = 0
      max_instances = 10
    }
    incubate = {
      image = "${var.primary_region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/incubate:${var.image_tag}"
      port  = 8080
      cpu   = "1"
      memory = "1Gi"
      min_instances = 0
      max_instances = 10
    }
    vector_store = {
      image = "${var.primary_region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/vector-store:${var.image_tag}"
      port  = 8080
      cpu   = "1"
      memory = "1Gi"
      min_instances = 0
      max_instances = 10
    }
    codegen = {
      image = "${var.primary_region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/codegen:${var.image_tag}"
      port  = 8080
      cpu   = "1"
      memory = "1Gi"
      min_instances = 0
      max_instances = 10
    }
    notification = {
      image = "${var.primary_region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/notification:${var.image_tag}"
      port  = 8080
      cpu   = "1"
      memory = "256Mi"
      min_instances = 0
      max_instances = 5
    }
    web = {
      image = "${var.primary_region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/web:${var.image_tag}"
      port  = 3000
      cpu   = "1"
      memory = "1Gi"
      min_instances = var.environment == "prod" ? 1 : 0
      max_instances = 20
    }
  }
}

module "cloud_run_services" {
  for_each = locals.services
  source   = "./modules/cloud_run"

  service_name    = "afroid-${replace(each.key, "_", "-")}-${var.environment}"
  region          = var.primary_region
  image           = each.value.image
  container_port  = each.value.port
  cpu             = each.value.cpu
  memory          = each.value.memory
  min_instances   = each.value.min_instances
  max_instances   = each.value.max_instances
  vpc_connector_id = google_vpc_access_connector.serverless_connector.id

  env_vars = {
    APP_ENV       = var.environment
    DATABASE_URL  = module.cloud_sql.database_connection_url
    REDIS_URL     = module.memorystore.redis_connection_url
    VERTEX_REGION = var.primary_region
  }
}

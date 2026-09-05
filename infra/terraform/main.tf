# ==============================================================================
# Afroid Sovereign Platform — Root Terraform Configuration (Hardened)
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

# --- Enable Required APIs ---

resource "google_project_service" "required_apis" {
  for_each = toset([
    "secretmanager.googleapis.com",
    "servicenetworking.googleapis.com",
    "sqladmin.googleapis.com",
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "vpcaccess.googleapis.com",
  ])

  service            = each.value
  disable_on_destroy = false
}

# --- VPC & Private Networking ---

resource "google_compute_network" "vpc_network" {
  name                    = "afroid-vpc-${var.environment}"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name                     = "afroid-subnet-${var.primary_region}-${var.environment}"
  ip_cidr_range            = "10.10.0.0/20"
  region                   = var.primary_region
  network                  = google_compute_network.vpc_network.id
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

# --- Service Account for Cloud Run Services ---

resource "google_service_account" "cloud_run_sa" {
  account_id   = "afroid-cloudrun-${var.environment}"
  display_name = "Afroid Cloud Run Service Account (${var.environment})"
}

# Grant the service account access to Secret Manager secrets
resource "google_project_iam_member" "cloud_run_secret_access" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Grant the service account access to Cloud SQL
resource "google_project_iam_member" "cloud_run_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
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

# --- Secret Manager: API Keys ---

resource "google_secret_manager_secret" "gemini_api_key" {
  secret_id = "afroid-gemini-api-key-${var.environment}"
  replication { auto {} }
}

resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "afroid-jwt-secret-${var.environment}"
  replication { auto {} }
}

resource "google_secret_manager_secret" "sendgrid_api_key" {
  secret_id = "afroid-sendgrid-api-key-${var.environment}"
  replication { auto {} }
}

# --- Cloud Run Services ---

locals {
  # Image prefix
  image_prefix = "${var.primary_region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}"

  # Shared secret env vars for all backend services
  shared_secret_env = {
    DATABASE_URL     = module.cloud_sql.db_password_secret_id
    JWT_SECRET       = google_secret_manager_secret.jwt_secret.secret_id
    GEMINI_API_KEY   = google_secret_manager_secret.gemini_api_key.secret_id
  }

  services = {
    gateway = {
      image         = "${local.image_prefix}/gateway:${var.image_tag}"
      port          = 8080
      cpu           = "1"
      memory        = "512Mi"
      min_instances = var.environment == "prod" ? 1 : 0
      max_instances = 10
      public_access = true
    }
    auth = {
      image         = "${local.image_prefix}/auth:${var.image_tag}"
      port          = 8080
      cpu           = "1"
      memory        = "512Mi"
      min_instances = var.environment == "prod" ? 1 : 0
      max_instances = 10
      public_access = false
    }
    platform = {
      image         = "${local.image_prefix}/platform:${var.image_tag}"
      port          = 8080
      cpu           = "1"
      memory        = "512Mi"
      min_instances = var.environment == "prod" ? 1 : 0
      max_instances = 10
      public_access = false
    }
    orchestrator = {
      image         = "${local.image_prefix}/orchestrator:${var.image_tag}"
      port          = 8080
      cpu           = "2"
      memory        = "2Gi"
      min_instances = var.environment == "prod" ? 1 : 0
      max_instances = 20
      public_access = false
    }
    certify = {
      image         = "${local.image_prefix}/certify:${var.image_tag}"
      port          = 8080
      cpu           = "1"
      memory        = "1Gi"
      min_instances = 0
      max_instances = 10
      public_access = false
    }
    incubate = {
      image         = "${local.image_prefix}/incubate:${var.image_tag}"
      port          = 8080
      cpu           = "1"
      memory        = "1Gi"
      min_instances = 0
      max_instances = 10
      public_access = false
    }
    vector_store = {
      image         = "${local.image_prefix}/vector-store:${var.image_tag}"
      port          = 8080
      cpu           = "1"
      memory        = "1Gi"
      min_instances = 0
      max_instances = 10
      public_access = false
    }
    codegen = {
      image         = "${local.image_prefix}/codegen:${var.image_tag}"
      port          = 8080
      cpu           = "1"
      memory        = "1Gi"
      min_instances = 0
      max_instances = 10
      public_access = false
    }
    notification = {
      image         = "${local.image_prefix}/notification:${var.image_tag}"
      port          = 8080
      cpu           = "1"
      memory        = "256Mi"
      min_instances = 0
      max_instances = 5
      public_access = false
    }
    web = {
      image         = "${local.image_prefix}/web:${var.image_tag}"
      port          = 3000
      cpu           = "1"
      memory        = "1Gi"
      min_instances = var.environment == "prod" ? 1 : 0
      max_instances = 20
      public_access = true
    }
  }
}

module "cloud_run_services" {
  for_each = local.services
  source   = "./modules/cloud_run"

  service_name          = "afroid-${replace(each.key, "_", "-")}-${var.environment}"
  region                = var.primary_region
  image                 = each.value.image
  container_port        = each.value.port
  cpu                   = each.value.cpu
  memory                = each.value.memory
  min_instances         = each.value.min_instances
  max_instances         = each.value.max_instances
  vpc_connector_id      = google_vpc_access_connector.serverless_connector.id
  public_access         = each.value.public_access
  service_account_email = google_service_account.cloud_run_sa.email

  env_vars = {
    APP_ENV       = var.environment
    VERTEX_REGION = var.primary_region
  }

  secret_env_vars = local.shared_secret_env
}

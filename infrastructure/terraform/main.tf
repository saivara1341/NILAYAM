terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.20.0"
    }
  }
  backend "gcs" {
    bucket = "nilayam-tf-state"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# --- Cloud Run: Frontend Service ---
resource "google_cloud_run_v2_service" "frontend" {
  name     = "nilayam-frontend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = 1
      max_instance_count = 5
    }
    containers {
      image = "gcr.io/${var.project_id}/nilayam-frontend:latest"
      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }
  }
}

# --- Cloud Run: Backend Service ---
resource "google_cloud_run_v2_service" "backend" {
  name     = "nilayam-backend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  template {
    scaling {
      min_instance_count = 1
      max_instance_count = 5
    }
    containers {
      image = "gcr.io/${var.project_id}/nilayam-backend:latest"
      resources {
        limits = {
          cpu    = "2"
          memory = "1024Mi"
        }
      }
      env {
        name  = "SPRING_PROFILES_ACTIVE"
        value = "prod"
      }
      # Real secrets bound here via Secret Manager
    }
  }
}

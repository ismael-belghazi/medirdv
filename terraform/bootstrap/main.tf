terraform {
  required_version = ">= 1.6.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "europe-north1"
}

resource "google_storage_bucket" "terraform_state" {
  project  = var.project_id
  name     = "${var.project_id}-terraform-state"
  location = var.region

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }
}

output "bucket_name" {
  value = google_storage_bucket.terraform_state.name
}

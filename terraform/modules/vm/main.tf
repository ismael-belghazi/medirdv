resource "google_compute_instance" "vm" {
  project      = var.project_id
  name         = var.name
  machine_type = var.machine_type
  zone         = var.zone

  tags = var.instance_tags

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 20
      type  = "pd-balanced"
    }
  }

  network_interface {
    subnetwork = var.subnetwork

    network_ip = var.network_ip != "" ? var.network_ip : null

    dynamic "access_config" {
      for_each = var.public_ip ? [1] : []

      content {}
    }
  }

  metadata = {
    ssh-keys = join("\n", var.ssh_public_keys)
  }

  metadata_startup_script = var.startup_script
}

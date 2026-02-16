resource "azurerm_container_app_environment" "this" {
  name                       = var.name
  resource_group_name        = var.resource_group_name
  location                   = var.location
  log_analytics_workspace_id = var.log_analytics_workspace_id

  # These settings require infrastructure_subnet_id to be set
  infrastructure_subnet_id       = var.infrastructure_subnet_id
  internal_load_balancer_enabled = var.infrastructure_subnet_id != null ? var.internal_load_balancer_enabled : null
  zone_redundancy_enabled        = var.infrastructure_subnet_id != null ? var.zone_redundancy_enabled : null

  # Disable public network access when internal mode is enabled
  public_network_access = var.internal_load_balancer_enabled ? "Disabled" : "Enabled"

  dynamic "workload_profile" {
    for_each = var.workload_profiles
    content {
      name                  = workload_profile.value.name
      workload_profile_type = workload_profile.value.workload_profile_type
      minimum_count         = workload_profile.value.minimum_count
      maximum_count         = workload_profile.value.maximum_count
    }
  }

  tags = var.tags

  # Note: prevent_destroy disabled to allow environment recreation for configuration changes
  lifecycle {
    prevent_destroy = false
  }
}

# Storage mount for Azure Files
resource "azurerm_container_app_environment_storage" "storage" {
  for_each = { for s in var.storage_mounts : s.name => s }

  name                         = each.value.name
  container_app_environment_id = azurerm_container_app_environment.this.id
  account_name                 = each.value.account_name
  share_name                   = each.value.share_name
  access_key                   = each.value.account_key
  access_mode                  = each.value.access_mode
}

# Dapr components (if configured)
resource "azurerm_container_app_environment_dapr_component" "dapr" {
  for_each = { for c in var.dapr_component_configs : c.name => c }

  name                         = each.value.name
  container_app_environment_id = azurerm_container_app_environment.this.id
  component_type               = each.value.component_type
  version                      = each.value.version
  scopes                       = each.value.scopes

  dynamic "metadata" {
    for_each = each.value.metadata
    content {
      name        = metadata.value.name
      value       = metadata.value.value
      secret_name = metadata.value.secret_name
    }
  }

  dynamic "secret" {
    for_each = each.value.secrets
    content {
      name  = secret.value.name
      value = secret.value.value
    }
  }
}

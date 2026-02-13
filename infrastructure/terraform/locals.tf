# Local Values - Centralized computed values used across the configuration

locals {
  # Location short names mapping
  location_short_map = {
    "East US"      = "eastus"
    "East US 2"    = "eastus2"
    "West US"      = "westus"
    "West US 2"    = "westus2"
    "Central US"   = "centralus"
    "North Europe" = "northeurope"
    "West Europe"  = "westeurope"
  }

  # Compute location short name
  location_short = lookup(local.location_short_map, var.location, lower(replace(var.location, " ", "")))

  # Naming prefix
  name_prefix = var.project_name

  # Resource names following Paychex naming convention
  resource_group_name     = "rg-${local.name_prefix}-${local.location_short}-${var.environment}-${var.resource_suffix}"
  container_apps_env_name = "cenv-${local.name_prefix}-${local.location_short}-${var.environment}-${var.resource_suffix}"
  container_app_name      = "con${var.app_name}${local.location_short}${var.environment}${var.resource_suffix}"
  key_vault_name          = coalesce(var.key_vault_name_override, "kv-pyx${local.name_prefix}-${var.environment}-${var.resource_suffix}")
  # Storage account name max 24 chars - use shortened env names
  storage_account_name         = "st${var.app_name}${local.env_short}${var.resource_suffix}"
  log_analytics_workspace_name = "log-${local.name_prefix}-${local.location_short}-${var.environment}-${var.resource_suffix}"
  application_insights_name    = "appi-${local.name_prefix}-${local.location_short}-${var.environment}-${var.resource_suffix}"

  # Short environment names for storage accounts (24 char limit)
  env_short_map = {
    "sandbox" = "eussbx"
    "n1"      = "eusn1"
    "n2a"     = "eusn2a"
    "prod"    = "eusprod"
  }
  env_short = lookup(local.env_short_map, var.environment, var.environment)

  # Common tags following Paychex tagging standards
  common_tags = merge(
    {
      payx_application            = var.payx_application
      payx_aqg-component-guid     = "N/A"
      payx_aqg-version-guid       = "N/A"
      payx_environment            = var.environment
      payx_externally-facing      = "true"
      payx_infrastructure-version = "terraform"
      payx_lob                    = var.payx_lob
      payx_owner                  = var.payx_owner
      payx_production             = var.environment == "prod" ? "prod" : "nonprod"
      payx_reaper                 = "true"
      payx_resource-scope         = "false"
      payx_sensitive-data         = "false"
      payx_sensitive-data-type    = "true"
      payx_servicenow-group       = var.payx_servicenow_group
      managed_by                  = "terraform"
      terraform_workspace         = terraform.workspace
    },
    var.tags
  )

  # Environment flags
  is_production  = var.environment == "prod"
  is_staging     = var.environment == "n2a"
  is_development = var.environment == "n1"

  # Container app internal URLs for sidecar communication
  rag_api_internal_url     = "http://${local.container_app_name}:8000"
  meilisearch_internal_url = "http://localhost:7700"

  # Key Vault secret prefix (uppercase environment)
  secret_prefix = upper(var.environment)

  # ACR ID - construct from name/rg if provided, otherwise use explicit ID
  acr_id = var.existing_acr_name != null ? "/subscriptions/${var.subscription_id}/resourceGroups/${var.existing_acr_resource_group}/providers/Microsoft.ContainerRegistry/registries/${var.existing_acr_name}" : var.existing_acr_id

}

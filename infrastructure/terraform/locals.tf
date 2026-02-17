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

  # Construct subnet IDs from subscription_id + VNet details (avoids hardcoding subscription IDs in tfvars)
  _vnet_base = var.existing_vnet_name != null ? "/subscriptions/${var.subscription_id}/resourceGroups/${var.existing_vnet_resource_group}/providers/Microsoft.Network/virtualNetworks/${var.existing_vnet_name}" : null

  # Infrastructure subnet: prefer name-based construction, fall back to explicit ID
  resolved_infrastructure_subnet_id = var.infrastructure_subnet_name != null ? "${local._vnet_base}/subnets/${var.infrastructure_subnet_name}" : var.infrastructure_subnet_id

  # Private endpoint subnet: prefer name-based construction, fall back to explicit ID
  resolved_private_endpoint_subnet_id = var.private_endpoint_subnet_name != null ? "${local._vnet_base}/subnets/${var.private_endpoint_subnet_name}" : var.private_endpoint_subnet_id

  # Shared private DNS zone IDs used by private endpoints
  private_dns_zone_ids_key_vault = var.enable_private_endpoints ? [
    "/subscriptions/${var.private_dns_zone_subscription_id}/resourceGroups/${var.private_dns_zone_resource_group}/providers/Microsoft.Network/privateDnsZones/${var.private_dns_zone_name_key_vault}"
  ] : []
  private_dns_zone_ids_storage = var.enable_private_endpoints ? [
    "/subscriptions/${var.private_dns_zone_subscription_id}/resourceGroups/${var.private_dns_zone_resource_group}/providers/Microsoft.Network/privateDnsZones/${var.private_dns_zone_name_storage}"
  ] : []

  # Key Vault subnet IDs: only needed when NOT using private endpoints
  # When private endpoints are enabled, the PE handles VNet-level access (no service endpoint needed)
  # When private endpoints are disabled, use explicit subnet IDs if provided
  resolved_key_vault_subnet_ids = var.enable_private_endpoints ? [] : var.key_vault_subnet_ids

  # RAG API naming and URL
  rag_container_app_name = "conpairag${local.location_short}${var.environment}${var.resource_suffix}"

  # Sidecar: localhost. Standalone: internal FQDN within Container Apps Environment
  rag_api_internal_url     = var.enable_rag_sidecar ? "http://localhost:8000" : "https://${azurerm_container_app.rag_api[0].ingress[0].fqdn}"
  meilisearch_internal_url = "http://localhost:7700"

  # Key Vault secret prefix (uppercase environment)
  secret_prefix = upper(var.environment)

  # ACR ID - construct from name/rg if provided, otherwise use explicit ID
  acr_id = var.existing_acr_name != null ? "/subscriptions/${var.subscription_id}/resourceGroups/${var.existing_acr_resource_group}/providers/Microsoft.ContainerRegistry/registries/${var.existing_acr_name}" : var.existing_acr_id

  # ACR login server and image source detection
  acr_login_server         = local.acr_id != null ? "${split("/", local.acr_id)[8]}.azurecr.io" : null
  librechat_image_uses_acr = local.acr_login_server != null && startswith(var.librechat_image, "${local.acr_login_server}/")
  rag_api_image_uses_acr   = local.acr_login_server != null && startswith(var.rag_api_image, "${local.acr_login_server}/")

}

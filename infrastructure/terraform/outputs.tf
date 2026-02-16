
output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
}

output "resource_group_id" {
  description = "ID of the resource group"
  value       = azurerm_resource_group.main.id
}

output "resource_group_location" {
  description = "Location of the resource group"
  value       = azurerm_resource_group.main.location
}

output "container_apps_subnet_id" {
  description = "ID of the subnet used for Container Apps (created or existing)"
  value       = local.container_apps_subnet_id
}

output "container_apps_subnet_name" {
  description = "Name of the subnet used for Container Apps (if created by Terraform)"
  value       = var.create_subnet ? azurerm_subnet.container_apps[0].name : null
}

output "key_vault_id" {
  description = "ID of the Key Vault"
  value       = azurerm_key_vault.main.id
}

output "key_vault_name" {
  description = "Name of the Key Vault"
  value       = azurerm_key_vault.main.name
}

output "key_vault_uri" {
  description = "URI of the Key Vault"
  value       = azurerm_key_vault.main.vault_uri
}

output "storage_account_id" {
  description = "ID of the storage account"
  value       = module.storage.storage_account_id
}

output "storage_account_name" {
  description = "Name of the storage account"
  value       = module.storage.storage_account_name
}

output "storage_primary_file_endpoint" {
  description = "Primary file endpoint of the storage account"
  value       = module.storage.primary_file_endpoint
}

output "mongodb_container_enabled" {
  description = "Whether MongoDB sidecar container is enabled"
  value       = var.enable_mongodb_container
}

output "container_apps_environment_id" {
  description = "ID of the Container Apps Environment"
  value       = module.container_apps_environment.id
}

output "container_apps_environment_name" {
  description = "Name of the Container Apps Environment"
  value       = module.container_apps_environment.name
}

output "container_apps_environment_default_domain" {
  description = "Default domain of the Container Apps Environment"
  value       = module.container_apps_environment.default_domain
}

output "container_apps_environment_static_ip" {
  description = "Static IP address of the Container Apps Environment"
  value       = module.container_apps_environment.static_ip_address
}

output "container_app_id" {
  description = "ID of the Container App"
  value       = module.container_app.id
}

output "container_app_name" {
  description = "Name of the Container App"
  value       = module.container_app.name
}

output "container_app_fqdn" {
  description = "FQDN of the Container App"
  value       = module.container_app.fqdn
}

output "container_app_url" {
  description = "URL of the Container App"
  value       = module.container_app.url
}

output "container_app_identity_principal_id" {
  description = "Principal ID of the Container App managed identity"
  value       = module.container_app.identity_principal_id
}

output "container_app_latest_revision_name" {
  description = "Name of the latest revision"
  value       = module.container_app.latest_revision_name
}

# RAG API Container App (standalone mode)

output "rag_api_mode" {
  description = "RAG API deployment mode (sidecar or standalone)"
  value       = var.enable_rag_sidecar ? "sidecar" : "standalone"
}

output "rag_api_container_app_name" {
  description = "Name of the standalone RAG API Container App (null if sidecar mode)"
  value       = var.enable_rag_sidecar ? null : azurerm_container_app.rag_api[0].name
}

output "rag_api_container_app_fqdn" {
  description = "FQDN of the standalone RAG API Container App (null if sidecar mode)"
  value       = var.enable_rag_sidecar ? null : try(azurerm_container_app.rag_api[0].ingress[0].fqdn, null)
}

output "log_analytics_workspace_id" {
  description = "ID of the Log Analytics Workspace"
  value       = azurerm_log_analytics_workspace.main.id
}

output "log_analytics_workspace_name" {
  description = "Name of the Log Analytics Workspace"
  value       = azurerm_log_analytics_workspace.main.name
}

output "application_insights_id" {
  description = "ID of Application Insights"
  value       = azurerm_application_insights.main.id
}

output "application_insights_instrumentation_key" {
  description = "Instrumentation key for Application Insights"
  value       = azurerm_application_insights.main.instrumentation_key
  sensitive   = true
}

output "application_insights_connection_string" {
  description = "Connection string for Application Insights"
  value       = azurerm_application_insights.main.connection_string
  sensitive   = true
}

output "environment" {
  description = "Environment name"
  value       = var.environment
}

output "custom_domain" {
  description = "Custom domain configured for the application"
  value       = var.domain
}

output "application_url" {
  description = "Full application URL"
  value       = "https://${var.domain}"
}

output "app_gateway_enabled" {
  description = "Whether Application Gateway is enabled"
  value       = var.enable_app_gateway
}

output "app_gateway_name" {
  description = "Name of the Application Gateway"
  value       = var.enable_app_gateway ? module.application_gateway[0].name : null
}

output "app_gateway_private_ip" {
  description = "Private IP address of the Application Gateway (use for DNS A record)"
  value       = var.enable_app_gateway ? module.application_gateway[0].private_ip_address : null
}

output "app_gateway_host_name" {
  description = "Custom domain hostname configured on the Application Gateway"
  value       = var.enable_app_gateway ? var.app_gateway_host_name : null
}

# Private Endpoints

output "private_endpoint_key_vault_id" {
  description = "ID of the Key Vault private endpoint"
  value       = length(module.private_endpoint_key_vault) > 0 ? module.private_endpoint_key_vault[0].id : null
}

output "private_endpoint_key_vault_ip" {
  description = "Private IP address of the Key Vault private endpoint"
  value       = length(module.private_endpoint_key_vault) > 0 ? module.private_endpoint_key_vault[0].private_ip_address : null
}

output "private_endpoint_storage_id" {
  description = "ID of the Storage private endpoint"
  value       = length(module.private_endpoint_storage) > 0 ? module.private_endpoint_storage[0].id : null
}

output "private_endpoint_storage_ip" {
  description = "Private IP address of the Storage private endpoint"
  value       = length(module.private_endpoint_storage) > 0 ? module.private_endpoint_storage[0].private_ip_address : null
}

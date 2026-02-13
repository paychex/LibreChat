# =============================================================================
# Application Gateway Module Outputs
# =============================================================================

output "id" {
  description = "ID of the Application Gateway"
  value       = azurerm_application_gateway.this.id
}

output "name" {
  description = "Name of the Application Gateway"
  value       = azurerm_application_gateway.this.name
}

output "private_ip_address" {
  description = "Private IP address of the Application Gateway (for DNS A record)"
  value       = var.private_ip_address
}

output "identity_principal_id" {
  description = "Principal ID of the Application Gateway managed identity (null if SSL disabled)"
  value       = var.enable_ssl ? azurerm_user_assigned_identity.appgw[0].principal_id : null
}

output "backend_address_pool_id" {
  description = "ID of the backend address pool"
  value       = tolist(azurerm_application_gateway.this.backend_address_pool)[0].id
}

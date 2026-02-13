output "id" {
  description = "ID of the Container App"
  value       = azurerm_container_app.this.id
}

output "name" {
  description = "Name of the Container App"
  value       = azurerm_container_app.this.name
}

output "fqdn" {
  description = "FQDN of the Container App"
  value       = try(azurerm_container_app.this.ingress[0].fqdn, null)
}

output "url" {
  description = "Full URL of the Container App"
  value       = try("https://${azurerm_container_app.this.ingress[0].fqdn}", null)
}

output "latest_revision_name" {
  description = "Name of the latest revision"
  value       = azurerm_container_app.this.latest_revision_name
}

output "latest_revision_fqdn" {
  description = "FQDN of the latest revision"
  value       = azurerm_container_app.this.latest_revision_fqdn
}

output "identity_principal_id" {
  description = "Principal ID of the system-assigned managed identity"
  value       = try(azurerm_container_app.this.identity[0].principal_id, null)
}

output "identity_tenant_id" {
  description = "Tenant ID of the system-assigned managed identity"
  value       = try(azurerm_container_app.this.identity[0].tenant_id, null)
}

output "outbound_ip_addresses" {
  description = "List of outbound IP addresses"
  value       = azurerm_container_app.this.outbound_ip_addresses
}

output "custom_domain_verification_id" {
  description = "Custom domain verification ID"
  value       = azurerm_container_app.this.custom_domain_verification_id
}

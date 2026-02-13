output "id" {
  description = "ID of the Container Apps Environment"
  value       = azurerm_container_app_environment.this.id
}

output "name" {
  description = "Name of the Container Apps Environment"
  value       = azurerm_container_app_environment.this.name
}

output "default_domain" {
  description = "Default domain of the Container Apps Environment"
  value       = azurerm_container_app_environment.this.default_domain
}

output "static_ip_address" {
  description = "Static IP address of the Container Apps Environment"
  value       = azurerm_container_app_environment.this.static_ip_address
}

output "docker_bridge_cidr" {
  description = "Docker bridge CIDR"
  value       = azurerm_container_app_environment.this.docker_bridge_cidr
}

output "platform_reserved_cidr" {
  description = "Platform reserved CIDR"
  value       = azurerm_container_app_environment.this.platform_reserved_cidr
}

output "platform_reserved_dns_ip_address" {
  description = "Platform reserved DNS IP address"
  value       = azurerm_container_app_environment.this.platform_reserved_dns_ip_address
}

output "storage_ids" {
  description = "Map of storage mount names to IDs"
  value       = { for k, v in azurerm_container_app_environment_storage.storage : k => v.id }
}

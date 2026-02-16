output "id" {
  description = "Private endpoint ID"
  value       = azurerm_private_endpoint.this.id
}

output "private_ip_address" {
  description = "Private IP address of the endpoint"
  value       = azurerm_private_endpoint.this.private_service_connection[0].private_ip_address
}

output "name" {
  description = "Private endpoint name"
  value       = azurerm_private_endpoint.this.name
}

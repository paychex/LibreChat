# Private Endpoint Module
# Creates a private endpoint for secure access to Azure PaaS resources

resource "azurerm_private_endpoint" "this" {
  name                = var.name
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_id
  tags                = var.tags

  private_service_connection {
    name                           = "${var.name}-connection"
    private_connection_resource_id = var.private_connection_resource_id
    subresource_names              = var.subresource_names
    is_manual_connection           = false
  }

  # Optional: DNS zone group for automatic DNS registration
  # Skip if DNS is managed externally (e.g., by hub network team)
  dynamic "private_dns_zone_group" {
    for_each = length(var.private_dns_zone_ids) > 0 ? [1] : []
    content {
      name                 = "${var.name}-dns-group"
      private_dns_zone_ids = var.private_dns_zone_ids
    }
  }
}

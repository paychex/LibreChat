variable "name" {
  description = "Name of the private endpoint"
  type        = string
}

variable "resource_group_name" {
  description = "Resource group name"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "subnet_id" {
  description = "Subnet ID for the private endpoint"
  type        = string
}

variable "private_connection_resource_id" {
  description = "Resource ID of the resource to connect to"
  type        = string
}

variable "subresource_names" {
  description = "Subresource names (e.g., 'vault' for Key Vault, 'file' for Storage)"
  type        = list(string)
}

variable "private_dns_zone_ids" {
  description = "Private DNS zone IDs for DNS registration (optional - pass empty list if DNS managed externally)"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

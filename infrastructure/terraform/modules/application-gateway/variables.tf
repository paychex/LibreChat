# =============================================================================
# Application Gateway Module Variables
# =============================================================================

variable "name" {
  description = "Name of the Application Gateway"
  type        = string
}

variable "location" {
  description = "Azure region for the Application Gateway"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

# =============================================================================
# SSL Configuration
# =============================================================================

variable "enable_ssl" {
  description = "Enable SSL/HTTPS listener (requires certificate in Key Vault). If false, uses HTTP on port 80."
  type        = bool
  default     = true
}

# =============================================================================
# Network Configuration
# =============================================================================

variable "subnet_id" {
  description = "ID of the subnet for Application Gateway (must be dedicated subnet)"
  type        = string
}

variable "private_ip_address" {
  description = "Static private IP address for the Application Gateway frontend"
  type        = string
}

# =============================================================================
# Scaling Configuration
# =============================================================================

variable "min_capacity" {
  description = "Minimum autoscale capacity (instances)"
  type        = number
  default     = 0
}

variable "max_capacity" {
  description = "Maximum autoscale capacity (instances)"
  type        = number
  default     = 2
}

# =============================================================================
# SSL/TLS Configuration
# =============================================================================

variable "ssl_certificate_name" {
  description = "Name for the SSL certificate configuration"
  type        = string
}

variable "ssl_certificate_key_vault_secret_id" {
  description = "Key Vault Secret ID for the SSL certificate (versioned or versionless URI)"
  type        = string
}

# =============================================================================
# Key Vault Configuration
# =============================================================================

variable "key_vault_id" {
  description = "ID of the Key Vault containing the SSL certificate"
  type        = string
}

variable "tenant_id" {
  description = "Azure AD tenant ID"
  type        = string
}

variable "key_vault_enable_rbac" {
  description = "Whether Key Vault uses RBAC authorization"
  type        = bool
  default     = false
}

# =============================================================================
# Backend Configuration
# =============================================================================

variable "backend_ip_address" {
  description = "IP address of the backend (Container Apps Environment static IP)"
  type        = string
}

variable "backend_host_name" {
  description = "Host name to send to backend (Container App FQDN)"
  type        = string
}

# =============================================================================
# Listener Configuration
# =============================================================================

variable "listener_host_name" {
  description = "Host name for the HTTPS listener (custom domain for incoming requests)"
  type        = string
}

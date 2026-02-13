variable "name" {
  description = "Name of the Container Apps Environment"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "log_analytics_workspace_id" {
  description = "ID of the Log Analytics workspace"
  type        = string
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

variable "infrastructure_subnet_id" {
  description = "Subnet ID for Container Apps infrastructure (optional)"
  type        = string
  default     = null
}

variable "internal_load_balancer_enabled" {
  description = "Use internal load balancer (requires subnet)"
  type        = bool
  default     = false
}

variable "zone_redundancy_enabled" {
  description = "Enable zone redundancy"
  type        = bool
  default     = false
}

variable "workload_profiles" {
  description = "List of workload profiles to create"
  type = list(object({
    name                  = string
    workload_profile_type = string
    minimum_count         = optional(number, 1)
    maximum_count         = optional(number, 3)
  }))
  default = []
}

variable "storage_mounts" {
  description = "Storage mounts for the environment"
  type = list(object({
    name         = string
    share_name   = string
    account_name = string
    account_key  = string
    access_mode  = optional(string, "ReadWrite")
  }))
  default = []
  # Note: sensitive = true removed to allow for_each iteration
  # The account_key is still handled securely within the resource
}

variable "dapr_component_configs" {
  description = "Dapr component configurations"
  type = list(object({
    name           = string
    component_type = string
    version        = string
    metadata = list(object({
      name        = string
      value       = optional(string)
      secret_name = optional(string)
    }))
    scopes = optional(list(string), [])
    secrets = optional(list(object({
      name  = string
      value = string
    })), [])
  }))
  default = []
}

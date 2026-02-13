variable "name" {
  description = "Name of the storage account"
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

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

variable "account_tier" {
  description = "Storage account tier (Standard, Premium)"
  type        = string
  default     = "Standard"
}

variable "account_replication_type" {
  description = "Replication type (LRS, GRS, RAGRS, ZRS, GZRS, RAGZRS)"
  type        = string
  default     = "LRS"
}

variable "account_kind" {
  description = "Storage account kind"
  type        = string
  default     = "StorageV2"
}

variable "access_tier" {
  description = "Access tier for blob storage"
  type        = string
  default     = "Hot"
}

variable "min_tls_version" {
  description = "Minimum TLS version"
  type        = string
  default     = "TLS1_2"
}

variable "enable_https_traffic_only" {
  description = "Only allow HTTPS traffic"
  type        = bool
  default     = true
}

variable "allow_nested_items_to_be_public" {
  description = "Allow public access to blobs"
  type        = bool
  default     = false
}

variable "shared_access_key_enabled" {
  description = "Enable shared access keys"
  type        = bool
  default     = true
}

variable "file_shares" {
  description = "List of file shares to create"
  type = list(object({
    name             = string
    quota            = optional(number, 50)
    access_tier      = optional(string, "TransactionOptimized")
    enabled_protocol = optional(string, "SMB")
  }))
  default = []
}

variable "network_rules" {
  description = "Network rules for storage account"
  type = object({
    default_action             = optional(string, "Allow")
    bypass                     = optional(list(string), ["AzureServices"])
    ip_rules                   = optional(list(string), [])
    virtual_network_subnet_ids = optional(list(string), [])
  })
  default = null
}

variable "blob_properties" {
  description = "Blob storage properties"
  type = object({
    versioning_enabled       = optional(bool, false)
    change_feed_enabled      = optional(bool, false)
    last_access_time_enabled = optional(bool, false)
    delete_retention_policy = optional(object({
      days = optional(number, 7)
    }))
    container_delete_retention_policy = optional(object({
      days = optional(number, 7)
    }))
  })
  default = null
}

variable "public_network_access_enabled" {
  description = "Enable public network access to storage account"
  type        = bool
  default     = true
}

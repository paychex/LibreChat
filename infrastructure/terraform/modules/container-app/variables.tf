variable "name" {
  description = "Name of the Container App"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "container_app_environment_id" {
  description = "ID of the Container Apps Environment"
  type        = string
}

variable "workload_profile_name" {
  description = "Name of the workload profile to use"
  type        = string
  default     = null
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

variable "revision_mode" {
  description = "Revision mode (Single or Multiple)"
  type        = string
  default     = "Single"
}

variable "max_inactive_revisions" {
  description = "Maximum number of inactive revisions"
  type        = number
  default     = 100
}

# =============================================================================
# Registry Configuration
# =============================================================================

variable "registry_server" {
  description = "Container registry server URL"
  type        = string
  default     = null
}

variable "registry_username" {
  description = "Container registry username"
  type        = string
  default     = null
}

variable "registry_password_secret_name" {
  description = "Secret name for registry password"
  type        = string
  default     = null
}

variable "registry_identity" {
  description = "Managed identity for registry access"
  type        = string
  default     = "system"
}

# =============================================================================
# Ingress Configuration
# =============================================================================

variable "ingress" {
  description = "Ingress configuration"
  type = object({
    external_enabled = optional(bool, true)
    target_port      = number
    transport        = optional(string, "auto")
    allow_insecure   = optional(bool, false)
    traffic_weight = list(object({
      latest_revision = optional(bool, true)
      revision_suffix = optional(string)
      percentage      = number
      label           = optional(string)
    }))
    custom_domain = optional(object({
      name                     = string
      certificate_id           = optional(string)
      certificate_binding_type = optional(string, "SniEnabled")
    }))
    sticky_sessions = optional(object({
      affinity = string
    }))
    additional_port_mappings = optional(list(object({
      external     = bool
      target_port  = number
      exposed_port = number
    })), [])
    ip_security_restrictions = optional(list(object({
      name             = string
      action           = string
      ip_address_range = string
      description      = optional(string)
    })), [])
    cors_policy = optional(object({
      allowed_origins   = list(string)
      allowed_methods   = optional(list(string))
      allowed_headers   = optional(list(string))
      expose_headers    = optional(list(string))
      max_age           = optional(number)
      allow_credentials = optional(bool)
    }))
  })
  default = null
}

# =============================================================================
# LibreChat Container Configuration
# =============================================================================

variable "librechat_container" {
  description = "Configuration for LibreChat container"
  type = object({
    image  = string
    name   = string
    cpu    = number
    memory = string
    env = optional(list(object({
      name  = string
      value = string
    })), [])
    secret_env = optional(list(object({
      name        = string
      secret_name = string
    })), [])
    volume_mounts = optional(list(object({
      name = string
      path = string
    })), [])
    command = optional(list(string))
    args    = optional(list(string))
  })
}

# =============================================================================
# RAG API Container Configuration
# =============================================================================

variable "rag_api_container" {
  description = "Configuration for RAG API container"
  type = object({
    image  = string
    name   = string
    cpu    = number
    memory = string
    env = optional(list(object({
      name  = string
      value = string
    })), [])
    secret_env = optional(list(object({
      name        = string
      secret_name = string
    })), [])
    volume_mounts = optional(list(object({
      name = string
      path = string
    })), [])
    command = optional(list(string))
    args    = optional(list(string))
  })
}

# =============================================================================
# MongoDB Container Configuration (Optional)
# =============================================================================

variable "mongodb_container" {
  description = "Optional MongoDB sidecar container for sandbox/dev environments"
  type = object({
    enabled = bool
    image   = optional(string, "mongo:7.0")
    name    = optional(string, "mongodb")
    cpu     = optional(number, 0.5)
    memory  = optional(string, "1Gi")
    env = optional(list(object({
      name  = string
      value = string
    })), [])
    volume_mounts = optional(list(object({
      name = string
      path = string
    })), [])
  })
  default = {
    enabled = false
  }
}

variable "meilisearch_container" {
  description = "Optional MeiliSearch sidecar container for sandbox/dev environments"
  type = object({
    enabled = bool
    image   = optional(string, "getmeili/meilisearch:v1.6")
    name    = optional(string, "meilisearch")
    cpu     = optional(number, 0.25)
    memory  = optional(string, "0.5Gi")
    env = optional(list(object({
      name  = string
      value = string
    })), [])
    secret_env = optional(list(object({
      name        = string
      secret_name = string
    })), [])
    volume_mounts = optional(list(object({
      name = string
      path = string
    })), [])
  })
  default = {
    enabled = false
  }
}

# =============================================================================
# Scaling Configuration
# =============================================================================

variable "scale" {
  description = "Scaling configuration"
  type = object({
    min_replicas = optional(number, 1)
    max_replicas = optional(number, 3)
    rules = optional(list(object({
      name = string
      custom = optional(object({
        type     = string
        metadata = map(string)
      }))
      http = optional(object({
        metadata = map(string)
      }))
      azure_queue = optional(object({
        queue_name   = string
        queue_length = number
        auth = list(object({
          secret_name       = string
          trigger_parameter = string
        }))
      }))
      tcp = optional(object({
        metadata = map(string)
      }))
    })), [])
  })
  default = {
    min_replicas = 1
    max_replicas = 3
  }
}

# =============================================================================
# Health Probes
# =============================================================================

variable "enable_health_probes" {
  description = "Enable health probes"
  type        = bool
  default     = true
}

variable "readiness_probe" {
  description = "Readiness probe configuration"
  type = object({
    path              = string
    port              = number
    initial_delay     = optional(number, 10)
    period            = optional(number, 5)
    timeout           = optional(number, 3)
    success_threshold = optional(number, 1)
    failure_threshold = optional(number, 3)
    transport         = optional(string, "HTTP")
  })
  default = null
}

variable "liveness_probe" {
  description = "Liveness probe configuration"
  type = object({
    path              = string
    port              = number
    initial_delay     = optional(number, 45)
    period            = optional(number, 15)
    timeout           = optional(number, 5)
    failure_threshold = optional(number, 5)
    transport         = optional(string, "HTTP")
  })
  default = null
}

variable "startup_probe" {
  description = "Startup probe configuration"
  type = object({
    path              = string
    port              = number
    initial_delay     = optional(number, 0)
    period            = optional(number, 10)
    timeout           = optional(number, 3)
    failure_threshold = optional(number, 30)
    transport         = optional(string, "HTTP")
  })
  default = null
}

# =============================================================================
# Secrets
# =============================================================================

variable "secrets" {
  description = "Secrets configuration (from Key Vault)"
  type = list(object({
    name                 = string
    key_vault_secret_url = optional(string)
    value                = optional(string)
    identity             = optional(string, "system")
  }))
  default = []
}

# =============================================================================
# Volumes
# =============================================================================

variable "volumes" {
  description = "Volume configurations"
  type = list(object({
    name         = string
    storage_name = optional(string)
    storage_type = optional(string, "AzureFile")
  }))
  default = []
}

# =============================================================================
# Identity
# =============================================================================

variable "identity_type" {
  description = "Type of managed identity (SystemAssigned, UserAssigned, SystemAssigned, UserAssigned)"
  type        = string
  default     = "SystemAssigned"
}

variable "user_assigned_identity_ids" {
  description = "List of user assigned identity IDs"
  type        = list(string)
  default     = []
}

variable "enable_rag_sidecar" {
  description = "Deploy RAG API as sidecar container (true) or skip it for standalone deployment (false)"
  type        = bool
  default     = true
}

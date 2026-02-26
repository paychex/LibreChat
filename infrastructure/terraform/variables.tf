
variable "subscription_id" {
  description = "Azure Subscription ID (injected via TF_VAR_subscription_id from GitHub secrets)"
  type        = string
}

variable "first_deploy" {
  description = "First deployment flag - relaxes network restrictions for initial provisioning (set via <ENV>_FIRST_DEPLOY GitHub variable)"
  type        = bool
  default     = false
}

variable "environment" {
  description = "Environment name (sandbox, n1, n2a, prod)"
  type        = string

  validation {
    condition     = contains(["sandbox", "n1", "n2a", "prod"], var.environment)
    error_message = "Environment must be one of: sandbox, n1, n2a, prod"
  }
}

variable "resource_suffix" {
  description = "Suffix for resource names (e.g., '001' or '002') - enables parallel infrastructure deployments"
  type        = string
  default     = "001"

  validation {
    condition     = can(regex("^[0-9]{3}$", var.resource_suffix))
    error_message = "Resource suffix must be a 3-digit number (e.g., '001', '002')"
  }
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "East US"
}

variable "project_name" {
  description = "Project name used in resource naming"
  type        = string
  default     = "playai"
}

variable "app_name" {
  description = "Application name used in resource naming"
  type        = string
  default     = "paichat"
}

variable "tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "payx_application" {
  description = "Paychex application tag"
  type        = string
  default     = "ai"
}

variable "payx_lob" {
  description = "Paychex line of business"
  type        = string
  default     = "apex"
}

variable "payx_owner" {
  description = "Paychex resource owner email (set via TF_VAR_payx_owner)"
  type        = string
  # No default - must be provided via GitHub Actions variable
}

variable "payx_servicenow_group" {
  description = "Paychex ServiceNow group (set via TF_VAR_payx_servicenow_group)"
  type        = string
  # No default - must be provided via GitHub Actions variable
}

variable "vnet_address_space" {
  description = "Address space for the virtual network"
  type        = list(string)
  default     = ["10.0.0.0/16"]
}

variable "container_apps_subnet_prefix" {
  description = "Subnet prefix for Container Apps"
  type        = string
  default     = "10.0.0.0/23"
}

# Option 1: Provide existing subnet ID (infrastructure_subnet_id)
# Option 2: Create new subnet in existing VNet (create_subnet = true)
# Option 3: Provide subnet name and let Terraform construct the ID from subscription_id + VNet details (infrastructure_subnet_name)

variable "infrastructure_subnet_id" {
  description = "Existing subnet ID for Container Apps Environment (required for internal mode unless create_subnet=true)"
  type        = string
  default     = null
}

variable "infrastructure_subnet_name" {
  description = "Name of existing subnet for Container Apps (alternative to infrastructure_subnet_id - constructs ID from subscription_id + VNet details)"
  type        = string
  default     = null

  validation {
    condition     = var.infrastructure_subnet_name == null || (var.existing_vnet_name != null && var.existing_vnet_resource_group != null)
    error_message = "When infrastructure_subnet_name is set, existing_vnet_name and existing_vnet_resource_group must also be set."
  }
}

variable "create_subnet" {
  description = "Create a new subnet in an existing VNet for Container Apps"
  type        = bool
  default     = false

  validation {
    condition     = !var.create_subnet || (var.existing_vnet_name != null && var.existing_vnet_resource_group != null && var.new_subnet_name != null && var.new_subnet_address_prefix != null)
    error_message = "When create_subnet=true, existing_vnet_name, existing_vnet_resource_group, new_subnet_name, and new_subnet_address_prefix are required."
  }
}

variable "existing_vnet_name" {
  description = "Name of existing VNet to create subnet in (required if create_subnet=true)"
  type        = string
  default     = null
}

variable "existing_vnet_resource_group" {
  description = "Resource group of existing VNet (required if create_subnet=true)"
  type        = string
  default     = null
}

variable "new_subnet_name" {
  description = "Name for the new subnet (required if create_subnet=true)"
  type        = string
  default     = null
}

variable "new_subnet_address_prefix" {
  description = "CIDR prefix for the new subnet (required if create_subnet=true, minimum /27 for Container Apps)"
  type        = string
  default     = null
}

variable "internal_load_balancer_enabled" {
  description = "Use internal load balancer (requires subnet)"
  type        = bool
  default     = false

  validation {
    condition     = !var.internal_load_balancer_enabled || var.create_subnet || var.infrastructure_subnet_id != null || var.infrastructure_subnet_name != null
    error_message = "When internal_load_balancer_enabled=true, provide a subnet via create_subnet=true, infrastructure_subnet_id, or infrastructure_subnet_name."
  }
}

# Private Endpoints Configuration
# Enable private endpoints for enterprise-grade network security

variable "enable_private_endpoints" {
  description = "Enable private endpoints for Key Vault and Storage (requires private_endpoint_subnet_id)"
  type        = bool
  default     = false

  validation {
    condition     = !var.enable_private_endpoints || var.private_endpoint_subnet_id != null || var.private_endpoint_subnet_name != null
    error_message = "When enable_private_endpoints=true, provide private_endpoint_subnet_id or private_endpoint_subnet_name."
  }
}

variable "private_endpoint_subnet_id" {
  description = "Subnet ID for private endpoints (separate from Container Apps subnet)"
  type        = string
  default     = null
}

variable "private_endpoint_subnet_name" {
  description = "Name of existing subnet for private endpoints (alternative to private_endpoint_subnet_id - constructs ID from subscription_id + VNet details)"
  type        = string
  default     = null

  validation {
    condition     = var.private_endpoint_subnet_name == null || (var.existing_vnet_name != null && var.existing_vnet_resource_group != null)
    error_message = "When private_endpoint_subnet_name is set, existing_vnet_name and existing_vnet_resource_group must also be set."
  }
}

variable "private_dns_zone_subscription_id" {
  description = "Subscription ID hosting shared private DNS zones (injected via TF_VAR_private_dns_zone_subscription_id)"
  type        = string
  default     = null

  validation {
    condition     = !var.enable_private_endpoints || var.private_dns_zone_subscription_id != null
    error_message = "When enable_private_endpoints=true, provide private_dns_zone_subscription_id."
  }
}

variable "private_dns_zone_resource_group" {
  description = "Resource group containing shared private DNS zones"
  type        = string
  default     = "rg-dns-shared-eastus-global-001"
}

variable "private_dns_zone_name_key_vault" {
  description = "Private DNS zone name for Key Vault private endpoints"
  type        = string
  default     = "privatelink.vaultcore.azure.net"
}

variable "private_dns_zone_name_storage" {
  description = "Private DNS zone name for Storage private endpoints"
  type        = string
  default     = "privatelink.file.core.windows.net"
}

variable "private_dns_zone_name_redis_enterprise" {
  description = "Private DNS zone name for Redis Enterprise private endpoints"
  type        = string
  default     = "privatelink.redisenterprise.cache.azure.net"
}

variable "key_vault_network_default_action" {
  description = "Default action for Key Vault network ACLs (Deny recommended for production)"
  type        = string
  default     = "Allow"

  validation {
    condition     = contains(["Allow", "Deny"], var.key_vault_network_default_action)
    error_message = "Key Vault network default action must be Allow or Deny."
  }
}

variable "key_vault_ip_rules" {
  description = "IP addresses/ranges allowed to access Key Vault (CIDR notation)"
  type        = list(string)
  default     = []
}

variable "key_vault_subnet_ids" {
  description = "Subnet IDs allowed to access Key Vault via service endpoints"
  type        = list(string)
  default     = []
}

variable "storage_public_network_access" {
  description = "Enable public network access to Storage Account (false for production)"
  type        = bool
  default     = true
}

variable "storage_network_default_action" {
  description = "Default action for Storage network rules (Deny recommended for production)"
  type        = string
  default     = "Allow"

  validation {
    condition     = contains(["Allow", "Deny"], var.storage_network_default_action)
    error_message = "Storage network default action must be Allow or Deny."
  }
}

variable "storage_ip_rules" {
  description = "IP addresses/ranges allowed to access Storage (CIDR notation)"
  type        = list(string)
  default     = []
}

variable "storage_subnet_ids" {
  description = "Subnet IDs allowed to access Storage via service endpoints"
  type        = list(string)
  default     = []
}

variable "acr_sku" {
  description = "SKU for Azure Container Registry"
  type        = string
  default     = "Premium"
}

variable "acr_admin_enabled" {
  description = "Enable admin user for ACR"
  type        = bool
  default     = false
}

variable "existing_acr_id" {
  description = "ID of existing Container Registry to use (if not creating new) - DEPRECATED, use existing_acr_name instead"
  type        = string
  default     = null
}

variable "existing_acr_name" {
  description = "Name of existing Container Registry to use"
  type        = string
  default     = null

  validation {
    condition     = var.existing_acr_name == null || var.existing_acr_resource_group != null
    error_message = "When existing_acr_name is set, existing_acr_resource_group must also be set."
  }
}

variable "existing_acr_resource_group" {
  description = "Resource group of existing Container Registry"
  type        = string
  default     = null
}

variable "skip_acr_role_assignment" {
  description = "Skip ACR role assignment (use when ACR is in different subscription - grant manually)"
  type        = bool
  default     = false
}

variable "key_vault_name_override" {
  description = "Override the Key Vault name (uses naming convention if not provided)"
  type        = string
  default     = null
}

variable "key_vault_resource_group_name" {
  description = "Resource group name for Key Vault (defaults to main resource group when null)"
  type        = string
  default     = null
}

variable "enable_mongodb_container" {
  description = "Enable MongoDB sidecar container for sandbox/dev environments"
  type        = bool
  default     = false
}

variable "mongodb_image" {
  description = "MongoDB container image"
  type        = string
  default     = "mongo:7.0"
}

variable "mongodb_cpu" {
  description = "CPU allocation for MongoDB container"
  type        = number
  default     = 0.5
}

variable "mongodb_memory" {
  description = "Memory allocation for MongoDB container"
  type        = string
  default     = "1Gi"
}

variable "enable_meilisearch_container" {
  description = "Enable MeiliSearch sidecar container for sandbox/dev environments"
  type        = bool
  default     = false
}

variable "meilisearch_image" {
  description = "MeiliSearch container image"
  type        = string
  default     = "getmeili/meilisearch:v1.6"
}

variable "meilisearch_cpu" {
  description = "CPU allocation for MeiliSearch container"
  type        = number
  default     = 0.25
}

variable "meilisearch_memory" {
  description = "Memory allocation for MeiliSearch container"
  type        = string
  default     = "0.5Gi"
}

variable "meilisearch_storage_quota" {
  description = "Storage quota (GB) for MeiliSearch data file share"
  type        = number
  default     = 5
}

variable "key_vault_sku" {
  description = "SKU for the Key Vault (standard or premium)"
  type        = string
  default     = "standard"

  validation {
    condition     = contains(["standard", "premium"], var.key_vault_sku)
    error_message = "Key Vault SKU must be 'standard' or 'premium'."
  }
}

variable "key_vault_soft_delete_retention_days" {
  description = "Number of days to retain soft-deleted Key Vaults (7-90)"
  type        = number
  default     = 7

  validation {
    condition     = var.key_vault_soft_delete_retention_days >= 7 && var.key_vault_soft_delete_retention_days <= 90
    error_message = "Soft delete retention must be between 7 and 90 days."
  }
}

variable "key_vault_additional_role_assignments" {
  description = "Additional Key Vault RBAC assignments"
  type = map(object({
    principal_id         = string
    role_definition_name = string
  }))
  default = {}
}

variable "key_vault_rbac_propagation_wait_seconds" {
  description = "Wait time in seconds for Key Vault RBAC role assignment propagation before creating/updating dependent resources"
  type        = number
  default     = 180

  validation {
    condition     = var.key_vault_rbac_propagation_wait_seconds >= 0 && var.key_vault_rbac_propagation_wait_seconds <= 900
    error_message = "Key Vault RBAC propagation wait must be between 0 and 900 seconds."
  }
}

variable "workload_profile_name" {
  description = "Name of the workload profile"
  type        = string
  default     = "paychexai"
}

variable "workload_profile_type" {
  description = "Type of workload profile (D4, D8, D16, D32, E4, E8, E16, E32)"
  type        = string
  default     = "D4"

  validation {
    condition     = contains(["D4", "D8", "D16", "D32", "E4", "E8", "E16", "E32"], var.workload_profile_type)
    error_message = "Workload profile type must be one of: D4, D8, D16, D32, E4, E8, E16, E32."
  }
}

variable "workload_profile_min_count" {
  description = "Minimum instance count for workload profile"
  type        = number
  default     = 1
}

variable "workload_profile_max_count" {
  description = "Maximum instance count for workload profile"
  type        = number
  default     = 3
}

variable "storage_account_kind" {
  description = "Storage account kind"
  type        = string
  default     = "StorageV2"

  validation {
    condition     = contains(["StorageV2", "FileStorage"], var.storage_account_kind)
    error_message = "Storage account kind must be one of: StorageV2, FileStorage."
  }
}

variable "storage_account_tier" {
  description = "Storage account tier (Standard or Premium)"
  type        = string
  default     = "Standard"

  validation {
    condition     = contains(["Standard", "Premium"], var.storage_account_tier)
    error_message = "Storage account tier must be 'Standard' or 'Premium'."
  }

  validation {
    condition     = var.storage_account_kind != "FileStorage" || var.storage_account_tier == "Premium"
    error_message = "FileStorage account kind requires storage_account_tier = Premium."
  }
}

variable "storage_account_replication" {
  description = "Storage account replication type"
  type        = string
  default     = "LRS"

  validation {
    condition     = contains(["LRS", "GRS", "ZRS", "RAGRS", "GZRS", "RAGZRS"], var.storage_account_replication)
    error_message = "Storage replication must be one of: LRS, GRS, ZRS, RAGRS, GZRS, RAGZRS."
  }

  validation {
    condition     = var.storage_account_kind != "FileStorage" || contains(["LRS", "ZRS"], var.storage_account_replication)
    error_message = "FileStorage account kind supports only LRS or ZRS replication."
  }
}

variable "storage_share_quota" {
  description = "File share quota in GB"
  type        = number
  default     = 100
}

variable "librechat_image" {
  description = "Container image for LibreChat"
  type        = string
}

variable "librechat_cpu" {
  description = "CPU cores for LibreChat container"
  type        = number
  default     = 1
}

variable "librechat_memory" {
  description = "Memory for LibreChat container (e.g., '2Gi', '4Gi', '8Gi')"
  type        = string
  default     = "2Gi"
}

variable "librechat_min_replicas" {
  description = "Minimum replicas for LibreChat"
  type        = number
  default     = 1
}

variable "librechat_max_replicas" {
  description = "Maximum replicas for LibreChat"
  type        = number
  default     = 3
}

variable "librechat_concurrent_requests" {
  description = "Concurrent requests for HTTP scaling"
  type        = number
  default     = 25
}

variable "rag_api_image" {
  description = "Container image for RAG API"
  type        = string
}

variable "rag_api_cpu" {
  description = "CPU cores for RAG API container"
  type        = number
  default     = 1
}

variable "rag_api_memory" {
  description = "Memory for RAG API container (e.g., '2Gi', '4Gi', '8Gi')"
  type        = string
  default     = "2Gi"
}

variable "enable_rag_sidecar" {
  description = "Deploy RAG API as sidecar in LibreChat container app (true for sandbox). When false, deploys as standalone Container App."
  type        = bool
  default     = true
}

variable "rag_api_min_replicas" {
  description = "Minimum replicas for standalone RAG API container app (only used when enable_rag_sidecar=false)"
  type        = number
  default     = 1
}

variable "rag_api_max_replicas" {
  description = "Maximum replicas for standalone RAG API container app (only used when enable_rag_sidecar=false)"
  type        = number
  default     = 3
}

variable "enable_langgraph_proxy" {
  description = "Deploy LangGraph proxy as a standalone Container App"
  type        = bool
  default     = false
}

variable "langgraph_proxy_image" {
  description = "Container image for LangGraph proxy"
  type        = string
  default     = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"
}

variable "langgraph_proxy_cpu" {
  description = "CPU cores for LangGraph proxy container"
  type        = number
  default     = 0.5
}

variable "langgraph_proxy_memory" {
  description = "Memory for LangGraph proxy container (e.g., '1Gi', '2Gi')"
  type        = string
  default     = "1Gi"
}

variable "langgraph_proxy_port" {
  description = "Container port for LangGraph proxy"
  type        = number
  default     = 8001
}

variable "langgraph_proxy_min_replicas" {
  description = "Minimum replicas for LangGraph proxy"
  type        = number
  default     = 1
}

variable "langgraph_proxy_max_replicas" {
  description = "Maximum replicas for LangGraph proxy"
  type        = number
  default     = 3
}

variable "langgraph_proxy_concurrent_requests" {
  description = "Concurrent requests for LangGraph proxy HTTP scaling"
  type        = number
  default     = 25
}

variable "redis_enterprise_sku_name" {
  description = "SKU name for Azure Managed Redis Enterprise cluster"
  type        = string
  default     = "Enterprise_E10-2"
}

variable "redis_enterprise_minimum_tls_version" {
  description = "Minimum TLS version for Azure Managed Redis Enterprise cluster"
  type        = string
  default     = "1.2"

  validation {
    condition     = contains(["1.0", "1.1", "1.2"], var.redis_enterprise_minimum_tls_version)
    error_message = "redis_enterprise_minimum_tls_version must be one of: 1.0, 1.1, 1.2."
  }
}

variable "redis_enterprise_zones" {
  description = "Availability zones for Azure Managed Redis Enterprise cluster"
  type        = list(string)
  default     = []
}

variable "redis_enterprise_database_name" {
  description = "Database name for Azure Managed Redis Enterprise"
  type        = string
  default     = "default"
}

variable "redis_enterprise_client_protocol" {
  description = "Client protocol for Azure Managed Redis Enterprise database"
  type        = string
  default     = "Encrypted"

  validation {
    condition     = contains(["Encrypted", "Plaintext"], var.redis_enterprise_client_protocol)
    error_message = "redis_enterprise_client_protocol must be Encrypted or Plaintext."
  }
}

variable "redis_enterprise_clustering_policy" {
  description = "Clustering policy for Azure Managed Redis Enterprise database"
  type        = string
  default     = "OSSCluster"

  validation {
    condition     = contains(["OSSCluster", "EnterpriseCluster"], var.redis_enterprise_clustering_policy)
    error_message = "redis_enterprise_clustering_policy must be OSSCluster or EnterpriseCluster."
  }
}

variable "redis_enterprise_eviction_policy" {
  description = "Eviction policy for Azure Managed Redis Enterprise database"
  type        = string
  default     = "NoEviction"
}

variable "openid_issuer" {
  description = "OpenID Connect issuer URL"
  type        = string
}

variable "openid_client_id" {
  description = "OpenID Connect client ID"
  type        = string
}

variable "openid_scope" {
  description = "OpenID Connect scope"
  type        = string
  default     = "openid profile email"
}

variable "openid_callback_url" {
  description = "OpenID Connect callback URL path"
  type        = string
  default     = "/oauth/openid/callback"
}

variable "domain" {
  description = "Custom domain for the application"
  type        = string
}

variable "allow_registration" {
  description = "Allow user registration"
  type        = bool
  default     = false
}

variable "allow_email_login" {
  description = "Allow email login"
  type        = bool
  default     = false
}

variable "allow_social_login" {
  description = "Allow social login"
  type        = bool
  default     = true
}

variable "debug_logging" {
  description = "Enable debug logging"
  type        = bool
  default     = true
}

variable "console_json" {
  description = "Enable JSON console output"
  type        = bool
  default     = true
}

variable "azure_openai_baseurl" {
  description = "Base URL for Azure OpenAI service"
  type        = string
}

variable "gcp_vertexai_baseurl" {
  description = "Base URL for GCP Vertex AI service"
  type        = string
}

variable "rag_azure_openai_endpoint" {
  description = "Azure OpenAI endpoint for RAG API"
  type        = string
}

variable "rag_azure_openai_api_version" {
  description = "Azure OpenAI API version for RAG"
  type        = string
  default     = "2024-10-21"
}

variable "embeddings_provider" {
  description = "Embeddings provider for RAG"
  type        = string
  default     = "azure"
}

variable "embeddings_model" {
  description = "Embeddings model for RAG"
  type        = string
  default     = "text-embedding-ada-002"
}

variable "custom_domain_certificate_id" {
  description = "ID of the managed certificate for custom domain (if already exists)"
  type        = string
  default     = null
}

variable "enable_health_probes" {
  description = "Enable health probes for container apps"
  type        = bool
  default     = true
}

variable "readiness_probe_initial_delay" {
  description = "Initial delay for readiness probe in seconds"
  type        = number
  default     = 10
}

variable "readiness_probe_period" {
  description = "Period for readiness probe in seconds"
  type        = number
  default     = 5
}

variable "liveness_probe_initial_delay" {
  description = "Initial delay for liveness probe in seconds"
  type        = number
  default     = 45
}

variable "liveness_probe_period" {
  description = "Period for liveness probe in seconds"
  type        = number
  default     = 15
}

variable "enable_app_gateway" {
  description = "Enable Application Gateway for stable DNS endpoint (internal only)"
  type        = bool
  default     = false

  validation {
    condition = !var.enable_app_gateway || (
      var.app_gateway_subnet_name != null &&
      var.app_gateway_host_name != null &&
      (
        !var.app_gateway_create_subnet || (
          var.app_gateway_subnet_address_prefix != null &&
          var.existing_vnet_name != null &&
          var.existing_vnet_resource_group != null
        )
      )
    )
    error_message = "When enable_app_gateway=true, set app_gateway_subnet_name and app_gateway_host_name. If app_gateway_create_subnet=true, also set app_gateway_subnet_address_prefix, existing_vnet_name, and existing_vnet_resource_group."
  }
}

variable "app_gateway_subnet_name" {
  description = "Name of existing subnet for Application Gateway (must be dedicated)"
  type        = string
  default     = null
}

variable "app_gateway_resource_group_name" {
  description = "Resource group name for Application Gateway (defaults to main resource group when null)"
  type        = string
  default     = null
}

variable "app_gateway_name_override" {
  description = "Override name for Application Gateway (uses naming convention when null)"
  type        = string
  default     = null
}

variable "app_gateway_create_subnet" {
  description = "Create a dedicated subnet for Application Gateway in the existing VNet"
  type        = bool
  default     = false
}

variable "app_gateway_subnet_address_prefix" {
  description = "CIDR prefix for App Gateway subnet when app_gateway_create_subnet=true"
  type        = string
  default     = null
}

variable "app_gateway_private_ip_offset" {
  description = "Offset for calculating private IP within App Gateway subnet (e.g., 10 gives .10 address)"
  type        = number
  default     = 10
}

variable "app_gateway_host_name" {
  description = "Custom domain hostname for Application Gateway listener (e.g., play.aisb.paychex.com)"
  type        = string
  default     = null
}

variable "app_gateway_probe_timeout_seconds" {
  description = "Application Gateway health probe timeout in seconds"
  type        = number
  default     = 30
}

variable "app_gateway_enable_ssl" {
  description = "Enable SSL/HTTPS on Application Gateway (requires certificate in Key Vault). If false, uses HTTP."
  type        = bool
  default     = true

  validation {
    condition     = !var.enable_app_gateway || !var.app_gateway_enable_ssl || var.app_gateway_ssl_certificate_name != null
    error_message = "When enable_app_gateway=true and app_gateway_enable_ssl=true, app_gateway_ssl_certificate_name is required."
  }
}

variable "app_gateway_ssl_certificate_name" {
  description = "Name of the SSL certificate in Key Vault for Application Gateway"
  type        = string
  default     = null
}

variable "app_gateway_min_capacity" {
  description = "Minimum autoscale capacity for Application Gateway"
  type        = number
  default     = 0
}

variable "app_gateway_max_capacity" {
  description = "Maximum autoscale capacity for Application Gateway"
  type        = number
  default     = 2
}

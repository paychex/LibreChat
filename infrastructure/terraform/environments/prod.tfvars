# Production Environment Configuration - High Availability

environment     = "prod"
location        = "East US"
resource_suffix = "002"

# Network Configuration - VNet Integration
internal_load_balancer_enabled = true
create_subnet                  = true
existing_vnet_name             = "vnet-paychexai-eastus-prod-001"
existing_vnet_resource_group   = "rg-paychexai-shared-eastus-prod-001"
new_subnet_name                = "snet-paychexai-playai-conapps-prod-001"
new_subnet_address_prefix      = "10.72.175.0/27"
infrastructure_subnet_id       = null

# Private Endpoints - enterprise network security
enable_private_endpoints       = true
private_endpoint_create_subnet = false
private_endpoint_subnet_name   = "snet-paychexai-privateendpoints-prod-001"

# Shared App Gateway resource group (used when enable_app_gateway=true)
create_shared_resource_group      = true
app_gateway_resource_group_name   = "rg-playai-shared-eastus-prod-001"
enable_app_gateway                = true
app_gateway_name_override         = "appgw-playai-eastus-prod-001"
app_gateway_create_subnet         = true
app_gateway_subnet_name           = "snet-paychexai-playai-appgw-prod-001"
app_gateway_subnet_address_prefix = "10.72.174.0/24"
app_gateway_host_name             = "play.ai.paychex.com"
app_gateway_enable_ssl            = false

# Key Vault Network Security
key_vault_network_default_action = "Deny"
key_vault_ip_rules               = ["141.123.123.100/32", "141.123.223.100/32"]
key_vault_resource_group_name    = "rg-playai-shared-eastus-prod-001"
# key_vault_subnet_ids auto-derived from private_endpoint_subnet when enable_private_endpoints=true

# Key Vault - production-grade retention
key_vault_soft_delete_retention_days = 90

# Storage Network Security
storage_public_network_access  = false
storage_network_default_action = "Deny"

# Container Images (placeholder - CI/CD deploys actual images)
librechat_image       = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"
rag_api_image         = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"
langgraph_proxy_image = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"

# Sidecars in LibreChat container app
enable_rag_sidecar                  = true
enable_meilisearch_container        = false
preserve_meilisearch_infrastructure = true
enable_langgraph_proxy              = true

# Existing ACR
existing_acr_name           = "conpaychexaiprod001"
existing_acr_resource_group = "rg-paychexai-shared-eastus-prod-001"
skip_acr_role_assignment    = true

# Domain Configuration
domain = "play.ai.paychex.com"

# OpenID Configuration
openid_issuer    = "https://login.microsoftonline.com/bcc529c5-dfce-4f97-b44f-debd50891d83/v2.0/"
openid_client_id = "a641b00b-5902-413c-b5e7-9d5b8cb57445"

# External Service URLs
azure_openai_baseurl      = "https://service-internal.paychex.com/is/librechat/azure/openai/deployments/$${DEPLOYMENT_NAME}"
gcp_vertexai_baseurl      = "https://service-internal.paychex.com/is/librechat"
rag_azure_openai_endpoint = "https://service-internal.paychex.com/is/librechat/azure/"

# Workload Profile (Production - higher capacity)
workload_profile_name      = "paychexai"
workload_profile_type      = "D8"
workload_profile_min_count = 3
workload_profile_max_count = 8

# Container Resources (Production - high resources)
librechat_cpu      = 1
librechat_memory   = "8Gi"
rag_api_cpu        = 1
rag_api_memory     = "8Gi"
meilisearch_cpu    = 1
meilisearch_memory = "2Gi"

# Scaling Configuration (Production - higher availability)
librechat_min_replicas        = 3
librechat_max_replicas        = 6
librechat_concurrent_requests = 25

# RAG API scaling (ignored in sidecar mode)
rag_api_min_replicas = 3
rag_api_max_replicas = 6

# Application Settings
allow_registration = false
allow_email_login  = false
allow_social_login = true
debug_logging      = false
console_json       = true

# Health Probes
enable_health_probes          = true
readiness_probe_initial_delay = 10
readiness_probe_period        = 5
liveness_probe_initial_delay  = 45
liveness_probe_period         = 15

# Storage
storage_account_kind                     = "FileStorage"
storage_account_tier                     = "Premium"
storage_account_replication              = "LRS"
storage_share_quota                      = 1024
meilisearch_storage_quota                = 100
enable_uploads_capacity_alert            = true
uploads_capacity_alert_threshold_percent = 80

# Tags (environment-specific overrides)
tags = {
  team        = "platform-engineering"
  cost-center = "ai-production"
  compliance  = "sox"
}

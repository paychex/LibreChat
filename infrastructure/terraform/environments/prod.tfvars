# Production Environment Configuration - High Availability

environment     = "prod"
location        = "East US"
resource_suffix = "002"

# Network Configuration - VNet Integration
# TODO: Update subnet names before enabling Terraform management
internal_load_balancer_enabled = true
create_subnet                  = false
existing_vnet_name             = "vnet-paychexai-eastus-prod-001"
existing_vnet_resource_group   = "rg-paychexai-shared-eastus-prod-001"
# infrastructure_subnet_name   = "<PROD_CONTAINER_APPS_SUBNET_NAME>"

# Private Endpoints - enterprise network security
# TODO: Enable after subnet names are configured
enable_private_endpoints = false
# private_endpoint_subnet_name = "<PROD_PRIVATE_ENDPOINT_SUBNET_NAME>"

# Key Vault Network Security
key_vault_network_default_action    = "Deny"
key_vault_ip_rules                  = ["141.123.123.100/32", "141.123.223.100/32"]
key_vault_enable_rbac_authorization = true
# key_vault_subnet_ids auto-derived from private_endpoint_subnet when enable_private_endpoints=true

# Key Vault - production-grade retention
key_vault_soft_delete_retention_days = 90

# Storage Network Security
storage_public_network_access  = false
storage_network_default_action = "Deny"

# Container Images (placeholder - CI/CD deploys actual images)
librechat_image = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"
rag_api_image   = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"

# RAG API - standalone container app (not sidecar)
enable_rag_sidecar = false

# Existing ACR
existing_acr_name           = "conpaychexaiprod001"
existing_acr_resource_group = "rg-paychexai-shared-eastus-prod-001"

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
workload_profile_max_count = 6

# Container Resources (Production - high resources)
librechat_cpu    = 1
librechat_memory = "8Gi"
rag_api_cpu      = 1
rag_api_memory   = "8Gi"

# Scaling Configuration (Production - higher availability)
librechat_min_replicas        = 3
librechat_max_replicas        = 6
librechat_concurrent_requests = 25

# RAG API scaling (standalone mode)
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
storage_share_quota = 250

# Tags (environment-specific overrides)
tags = {
  team        = "platform-engineering"
  cost-center = "ai-production"
  compliance  = "sox"
}

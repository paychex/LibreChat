# N1 Environment Configuration - Non-Production Development

environment     = "n1"
location        = "East US"
resource_suffix = "002"

# Network Configuration - VNet Integration (matches existing N1)
internal_load_balancer_enabled = true
create_subnet                  = false
existing_vnet_name             = "vnet-paychexai-eastus-nonprod-001"
existing_vnet_resource_group   = "rg-paychexai-shared-eastus-nonprod-001"
infrastructure_subnet_name     = "snet-paychexai-conapps-n1-002"

# Private Endpoints - enterprise network security
# Subnet ID constructed from subscription_id + VNet details (no hardcoded subscription IDs)
enable_private_endpoints     = true
private_endpoint_subnet_name = "snet-paychexai-privateendpoints-n1-001"

# Key Vault Network Security
# key_vault_subnet_ids auto-derived from private_endpoint_subnet when enable_private_endpoints=true
key_vault_network_default_action = "Deny"
key_vault_ip_rules               = ["141.123.123.100/32", "141.123.223.100/32"]

# Storage Network Security
storage_public_network_access  = false
storage_network_default_action = "Deny"

# Container Images (placeholder - CI/CD deploys actual images)
librechat_image = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"
rag_api_image   = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"

# RAG API - standalone container app (not sidecar)
enable_rag_sidecar = false

# Existing ACR (shared across environments)
existing_acr_name           = "conpaychexaiprod001"
existing_acr_resource_group = "rg-paychexai-shared-eastus-prod-001"

# Domain Configuration
domain = "play.ain1.paychex.com"

# OpenID Configuration
openid_issuer    = "https://login.microsoftonline.com/bcc529c5-dfce-4f97-b44f-debd50891d83/v2.0/"
openid_client_id = "89b0e6f6-6b38-4016-8f98-13fd6af9b589"

# External Service URLs
azure_openai_baseurl      = "https://service-internal-n1.paychex.com/is/librechat/azure/openai/deployments/$${DEPLOYMENT_NAME}"
gcp_vertexai_baseurl      = "https://service-internal-n1.paychex.com/is/librechat"
rag_azure_openai_endpoint = "https://service-internal-n1.paychex.com/is/librechat/azure/"

# Workload Profile
workload_profile_name      = "paychexai"
workload_profile_type      = "D4"
workload_profile_min_count = 3
workload_profile_max_count = 6

# Container Resources (N1 - lighter resources)
librechat_cpu    = 1
librechat_memory = "2Gi"
rag_api_cpu      = 1
rag_api_memory   = "2Gi"

# Scaling Configuration
librechat_min_replicas        = 3
librechat_max_replicas        = 6
librechat_concurrent_requests = 25

# RAG API scaling (standalone mode)
rag_api_min_replicas = 2
rag_api_max_replicas = 4

# Application Settings
allow_registration = false
allow_email_login  = false
allow_social_login = true
debug_logging      = true
console_json       = true

# Health Probes
enable_health_probes          = true
readiness_probe_initial_delay = 10
readiness_probe_period        = 5
liveness_probe_initial_delay  = 45
liveness_probe_period         = 15

# Storage
storage_share_quota = 50

# Tags (environment-specific overrides)
tags = {
  team        = "platform-engineering"
  cost-center = "ai-dev"
}

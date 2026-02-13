# N2A Environment Configuration - Non-Production Staging/UAT

environment     = "n2a"
location        = "East US"
resource_suffix = "002"

# Network Configuration - VNet Integration
# Create new subnet in existing VNet (managed by network team)
internal_load_balancer_enabled = true
create_subnet                  = true
existing_vnet_name             = "vnet-paychexai-eastus-nonprod-001"
existing_vnet_resource_group   = "rg-paychexai-shared-eastus-nonprod-001"
new_subnet_name                = "snet-paychexai-conapps-n2a-003"
new_subnet_address_prefix      = "10.72.58.0/27"
infrastructure_subnet_id       = null

# Private Endpoints - enterprise network security
enable_private_endpoints   = true
private_endpoint_subnet_id = "/subscriptions/819386da-14b6-4ae4-a16d-7475c98e6a9b/resourceGroups/rg-paychexai-shared-eastus-nonprod-001/providers/Microsoft.Network/virtualNetworks/vnet-paychexai-eastus-nonprod-001/subnets/snet-paychexai-privateendpoints-n2a-001"

# Key Vault Network Security - Deny by default, first_deploy=true temporarily allows
key_vault_network_default_action = "Deny"
key_vault_ip_rules               = ["141.123.123.100/32", "141.123.223.100/32"] # Paychex IPs
key_vault_subnet_ids             = ["/subscriptions/819386da-14b6-4ae4-a16d-7475c98e6a9b/resourceGroups/rg-paychexai-shared-eastus-nonprod-001/providers/Microsoft.Network/virtualNetworks/vnet-paychexai-eastus-nonprod-001/subnets/snet-paychexai-privateendpoints-n2a-001"]

# Storage Network Security - private access only
storage_public_network_access  = false
storage_network_default_action = "Deny"

# Container Images (placeholder - CI/CD deploys actual images)
librechat_image = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"
rag_api_image   = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"

# Existing ACR (shared across environments - in prod subscription)
# Role assignment skipped - grant AcrPull manually to N2A managed identity
existing_acr_name           = "conpaychexaiprod001"
existing_acr_resource_group = "rg-playai-eastus-prod-001"
skip_acr_role_assignment    = true

# Domain Configuration
domain = "play.ain2a.paychex.com"

# OpenID Configuration
openid_issuer    = "https://login.microsoftonline.com/bcc529c5-dfce-4f97-b44f-debd50891d83/v2.0/"
openid_client_id = "1ebba027-b707-42b7-b509-44566c9ecff1"

# External Service URLs
azure_openai_baseurl      = "https://service-internal-n2a.paychex.com/is/librechat/azure/openai/deployments/$${DEPLOYMENT_NAME}"
gcp_vertexai_baseurl      = "https://service-internal-n2a.paychex.com/is/librechat"
rag_azure_openai_endpoint = "https://service-internal-n2a.paychex.com/is/librechat/azure/"

# Workload Profile
workload_profile_name      = "paychexai"
workload_profile_type      = "D4"
workload_profile_min_count = 3
workload_profile_max_count = 6

# Container Resources (N2A - moderate resources for UAT)
librechat_cpu    = 2
librechat_memory = "4Gi"
rag_api_cpu      = 1
rag_api_memory   = "4Gi"

# Scaling Configuration
librechat_min_replicas        = 3
librechat_max_replicas        = 6
librechat_concurrent_requests = 25

# Application Settings
allow_registration = false
allow_email_login  = true # Email login enabled for testing
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
storage_share_quota = 100

# Tags (environment-specific overrides)
tags = {
  team        = "platform-engineering"
  cost-center = "ai-staging"
}

# Sandbox Environment Configuration

environment = "sandbox"
location    = "East US"

# Sidecar containers for sandbox (MongoDB, MeiliSearch)
# N2A/N1/Prod use MongoDB Atlas with private endpoints instead
enable_mongodb_container     = true
enable_meilisearch_container = true
enable_rag_sidecar           = true

# Network: Internal mode using sandbox VNet
create_subnet                  = true
existing_vnet_name             = "vnet-paychexai-eastus-sandbox-001"
existing_vnet_resource_group   = "rg-paychexai-shared-eastus-sandbox-001"
new_subnet_name                = "snet-paychexai-conapps-librechat-sandbox-001"
new_subnet_address_prefix      = "10.72.85.32/27"
infrastructure_subnet_id       = null
internal_load_balancer_enabled = true

# Application Gateway: Provides stable DNS endpoint
# DNS (play.aisb.paychex.com) points to App Gateway, which forwards to Container Apps.
# If Container Apps is recreated, only App Gateway backend needs updating - DNS stays stable.
enable_app_gateway               = true
app_gateway_subnet_name          = "snet-paychexai-appgw-sandbox-001"
app_gateway_private_ip_offset    = 50
app_gateway_host_name            = "play.aisb.paychex.com"
app_gateway_enable_ssl           = false # Disabled until SSL cert uploaded to Key Vault
app_gateway_ssl_certificate_name = "play-aisb-paychex-com"
app_gateway_min_capacity         = 0
app_gateway_max_capacity         = 2

# Container Images (CI/CD deploys actual images)
librechat_image = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"
rag_api_image   = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"

# Existing ACR
existing_acr_name           = "acrpaychexaisandbox001"
existing_acr_resource_group = "rg-paychexai-aks-eastus-sandbox-001"

# Key Vault authorization mode
key_vault_enable_rbac_authorization = true

key_vault_name_override = "kv-pyxplayai-sandbox-001"
# Use the actual Container App FQDN (custom domain not configured yet)
domain = "conpaichateastussandbox001.agreeablemeadow-1fccb990.eastus.azurecontainerapps.io"

# OpenID (using n2a values for sandbox testing)
openid_issuer    = "https://login.microsoftonline.com/bcc529c5-dfce-4f97-b44f-debd50891d83/v2.0/"
openid_client_id = "1ebba027-b707-42b7-b509-44566c9ecff1"

# External Service URLs (using n2a values for sandbox testing)
azure_openai_baseurl      = "https://service-internal-n2a.paychex.com/is/librechat/azure/openai/deployments/$${DEPLOYMENT_NAME}"
gcp_vertexai_baseurl      = "https://service-internal-n2a.paychex.com/is/librechat"
rag_azure_openai_endpoint = "https://service-internal-n2a.paychex.com/is/librechat/azure/openai/"

# Workload Profile
workload_profile_name      = "paychexai"
workload_profile_type      = "D4"
workload_profile_min_count = 1
workload_profile_max_count = 2

# Container Resources (minimal for sandbox)
librechat_cpu    = 0.5
librechat_memory = "1Gi"
rag_api_cpu      = 0.25
rag_api_memory   = "0.5Gi"

# Scaling (minimal)
librechat_min_replicas        = 0
librechat_max_replicas        = 1
librechat_concurrent_requests = 10

# Application Settings
allow_registration = true
allow_email_login  = true
allow_social_login = true
debug_logging      = true
console_json       = true

# Health Probes
enable_health_probes          = true
readiness_probe_initial_delay = 10
readiness_probe_period        = 5
liveness_probe_initial_delay  = 45
liveness_probe_period         = 15

storage_share_quota = 10

tags = {
  team        = "platform-engineering"
  cost-center = "development"
  purpose     = "sandbox-experimentation"
}

# Main Terraform Configuration for LibreChat Azure Infrastructure
# Local values defined in locals.tf

resource "azurerm_resource_group" "main" {
  name     = local.resource_group_name
  location = var.location
  tags     = local.common_tags
}

# Creates a new subnet in an existing VNet for internal Container Apps.
# The VNet must already exist (managed by network team).

data "azurerm_virtual_network" "existing" {
  count               = var.create_subnet ? 1 : 0
  name                = var.existing_vnet_name
  resource_group_name = var.existing_vnet_resource_group
}

resource "azurerm_subnet" "container_apps" {
  count                = var.create_subnet ? 1 : 0
  name                 = var.new_subnet_name
  resource_group_name  = var.existing_vnet_resource_group
  virtual_network_name = var.existing_vnet_name
  address_prefixes     = [var.new_subnet_address_prefix]

  # Required delegation for Container Apps Environment
  delegation {
    name = "Microsoft.App.environments"
    service_delegation {
      name    = "Microsoft.App/environments"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

# Determine which subnet ID to use: new subnet or existing
locals {
  container_apps_subnet_id = var.create_subnet ? azurerm_subnet.container_apps[0].id : local.resolved_infrastructure_subnet_id
}

resource "azurerm_log_analytics_workspace" "main" {
  name                = local.log_analytics_workspace_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = var.log_analytics_retention_days
  tags                = local.common_tags
}

resource "azurerm_application_insights" "main" {
  name                = local.application_insights_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "web"
  tags                = local.common_tags
}

# Secrets should be populated via Azure CLI, Portal, or CI/CD after deployment.

resource "azurerm_key_vault" "main" {
  name                = local.key_vault_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = var.key_vault_sku
  tags                = local.common_tags

  # Security settings
  soft_delete_retention_days      = var.key_vault_soft_delete_retention_days
  purge_protection_enabled        = local.is_production
  enable_rbac_authorization       = var.key_vault_enable_rbac_authorization
  enabled_for_disk_encryption     = false
  enabled_for_deployment          = false
  enabled_for_template_deployment = false

  # Network configuration - configurable per environment
  # Production/N2A: default_action=Deny with VNet rules + private endpoint
  # Sandbox: default_action=Allow for easier development
  # first_deploy=true: fully open access (no IP/VNet rules) for initial provisioning
  network_acls {
    default_action             = var.first_deploy ? "Allow" : var.key_vault_network_default_action
    bypass                     = "AzureServices"
    ip_rules                   = var.first_deploy ? [] : var.key_vault_ip_rules
    virtual_network_subnet_ids = var.first_deploy ? [] : local.resolved_key_vault_subnet_ids
  }
}

# Created before Container App to grant Key Vault access first (solves chicken-egg problem)

resource "azurerm_user_assigned_identity" "container_app" {
  name                = "id-${local.container_app_name}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  tags                = local.common_tags
}

# --- Access Policy mode (when RBAC is disabled) ---
resource "azurerm_key_vault_access_policy" "container_app_uami" {
  count = var.key_vault_enable_rbac_authorization ? 0 : 1

  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_user_assigned_identity.container_app.principal_id

  secret_permissions = ["Get", "List"]
}

resource "azurerm_key_vault_access_policy" "container_app" {
  count = var.key_vault_enable_rbac_authorization ? 0 : 1

  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = module.container_app.identity_principal_id

  secret_permissions = ["Get", "List"]

  depends_on = [module.container_app]
}

resource "azurerm_key_vault_access_policy" "deployer" {
  count = var.key_vault_enable_rbac_authorization ? 0 : 1

  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azurerm_client_config.current.object_id

  secret_permissions      = ["Get", "List", "Set", "Delete", "Purge", "Recover"]
  certificate_permissions = ["Get", "List", "Import"]
}

# --- RBAC mode (when RBAC is enabled) ---
resource "azurerm_role_assignment" "kv_secrets_user_uami" {
  count                = var.key_vault_enable_rbac_authorization ? 1 : 0
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.container_app.principal_id
}

resource "azurerm_role_assignment" "kv_secrets_user_container_app" {
  count                = var.key_vault_enable_rbac_authorization ? 1 : 0
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.container_app.identity_principal_id
  depends_on           = [module.container_app]
}

resource "azurerm_role_assignment" "kv_secrets_officer_deployer" {
  count                = var.key_vault_enable_rbac_authorization ? 1 : 0
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azurerm_client_config.current.object_id
}

resource "azurerm_role_assignment" "kv_certificates_officer_deployer" {
  count                = var.key_vault_enable_rbac_authorization ? 1 : 0
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Certificates Officer"
  principal_id         = data.azurerm_client_config.current.object_id
}

# --- ACR Pull (always uses RBAC, independent of KV auth mode) ---
resource "azurerm_role_assignment" "container_app_acr_pull" {
  count                = local.acr_id != null && !var.skip_acr_role_assignment ? 1 : 0
  scope                = local.acr_id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.container_app.principal_id
}

# RBAC role assignments can take up to 10 minutes to propagate in Azure AD.
# This sleep ensures the deployer's Secrets Officer role is active before creating secrets.
resource "time_sleep" "wait_for_rbac_propagation" {
  count           = var.key_vault_enable_rbac_authorization ? 1 : 0
  create_duration = "${var.key_vault_rbac_propagation_wait_seconds}s"

  depends_on = [
    azurerm_role_assignment.kv_secrets_officer_deployer,
    azurerm_role_assignment.kv_certificates_officer_deployer
  ]
}

# Key Vault Secrets
locals {
  # Placeholder values - update after first deploy
  base_kv_secrets = {
    "${upper(var.environment)}-OPENID-SESSION-SECRET" = "PLACEHOLDER-UPDATE-ME-${random_id.secret_suffix.hex}"
    "${upper(var.environment)}-OPENID-CLIENT-SECRET"  = "PLACEHOLDER-UPDATE-ME-${random_id.secret_suffix.hex}"
    "${upper(var.environment)}-JWT-SECRET"            = "PLACEHOLDER-UPDATE-ME-${random_id.secret_suffix.hex}"
    "${upper(var.environment)}-JWT-REFRESH-SECRET"    = "PLACEHOLDER-UPDATE-ME-${random_id.secret_suffix.hex}"
    "${upper(var.environment)}-CREDS-KEY"             = "PLACEHOLDER-UPDATE-ME-${random_id.secret_suffix.hex}"
    "${upper(var.environment)}-CREDS-IV"              = "PLACEHOLDER-UPDATE-ME-${random_id.secret_suffix.hex}"
    "${upper(var.environment)}-MAAS-API-KEY"          = "PLACEHOLDER-UPDATE-ME-${random_id.secret_suffix.hex}"
    "${upper(var.environment)}-TAVILY-API-KEY"        = "PLACEHOLDER-UPDATE-ME-${random_id.secret_suffix.hex}"
  }

  # MongoDB secrets - placeholder values for initial deployment (update manually for Atlas)
  # For sandbox with MongoDB container: set to mongodb://localhost:27017/librechat
  mongodb_placeholder_secrets = {
    "${upper(var.environment)}-MONGO-CONNECTION-STRING"         = var.enable_mongodb_container ? "mongodb://localhost:27017/librechat" : "mongodb://placeholder:27017"
    "${upper(var.environment)}-RAG-API-MONGO-CONNECTION-STRING" = var.enable_mongodb_container ? "mongodb://localhost:27017/librechat" : "mongodb://placeholder:27017"
  }

  # MeiliSearch secrets - auto-generated secure key
  meilisearch_secrets = var.enable_meilisearch_container ? {
    "${upper(var.environment)}-MEILISEARCH-MASTER-KEY" = random_password.meilisearch_master_key[0].result
  } : {}

  # Combine the secrets
  kv_secrets = merge(local.base_kv_secrets, local.mongodb_placeholder_secrets, local.meilisearch_secrets)
}

resource "random_id" "secret_suffix" {
  byte_length = 8
}

# Generate secure MeiliSearch master key (only when enabled)
resource "random_password" "meilisearch_master_key" {
  count   = var.enable_meilisearch_container ? 1 : 0
  length  = 32
  special = false
}

resource "azurerm_key_vault_secret" "secrets" {
  for_each = local.kv_secrets

  name         = each.key
  value        = each.value
  key_vault_id = azurerm_key_vault.main.id

  # Ensure deployer has access before creating secrets (access policy OR RBAC with propagation wait)
  depends_on = [
    azurerm_key_vault_access_policy.deployer,
    time_sleep.wait_for_rbac_propagation
  ]

  # Don't overwrite manual secret updates
  lifecycle {
    ignore_changes = [value]
  }
}

module "storage" {
  source = "./modules/storage"

  name                = local.storage_account_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  tags                = local.common_tags

  account_tier             = var.storage_account_tier
  account_replication_type = var.storage_account_replication

  # Network security - configurable per environment
  # first_deploy=true: temporarily enables public access for initial provisioning
  public_network_access_enabled = var.first_deploy ? true : var.storage_public_network_access

  network_rules = (!var.first_deploy && var.storage_network_default_action == "Deny") ? {
    default_action             = "Deny"
    bypass                     = ["AzureServices"]
    ip_rules                   = var.storage_ip_rules
    virtual_network_subnet_ids = var.storage_subnet_ids
  } : null

  file_shares = concat(
    [
      {
        name  = "uploads-${var.environment}"
        quota = var.storage_share_quota
      }
    ],
    var.enable_meilisearch_container ? [
      {
        name  = "meilisearch-data-${var.environment}"
        quota = var.meilisearch_storage_quota
      }
    ] : []
  )
}

# Private Endpoints for Key Vault and Storage
# Required for enterprise-grade network security (N2A/N1/Prod)
# Skipped during first_deploy to allow GitHub runner access for initial provisioning

module "private_endpoint_key_vault" {
  count  = var.enable_private_endpoints && !var.first_deploy ? 1 : 0
  source = "./modules/private-endpoint"

  name                           = "pept-${local.name_prefix}-kv-${var.environment}-${var.resource_suffix}"
  location                       = azurerm_resource_group.main.location
  resource_group_name            = azurerm_resource_group.main.name
  subnet_id                      = local.resolved_private_endpoint_subnet_id
  private_connection_resource_id = azurerm_key_vault.main.id
  subresource_names              = ["vault"]
  tags                           = local.common_tags

  # DNS managed externally by hub network team
  private_dns_zone_ids = []
}

module "private_endpoint_storage" {
  count  = var.enable_private_endpoints && !var.first_deploy ? 1 : 0
  source = "./modules/private-endpoint"

  name                           = "pept-${local.name_prefix}-files-${var.environment}-${var.resource_suffix}"
  location                       = azurerm_resource_group.main.location
  resource_group_name            = azurerm_resource_group.main.name
  subnet_id                      = local.resolved_private_endpoint_subnet_id
  private_connection_resource_id = module.storage.storage_account_id
  subresource_names              = ["file"]
  tags                           = local.common_tags

  # DNS managed externally by hub network team
  private_dns_zone_ids = []
}

module "container_apps_environment" {
  source = "./modules/container-apps-environment"

  name                       = local.container_apps_env_name
  resource_group_name        = azurerm_resource_group.main.name
  location                   = azurerm_resource_group.main.location
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  tags                       = local.common_tags

  # Network configuration for internal mode
  # Uses either: new subnet (create_subnet=true) or existing subnet (infrastructure_subnet_id)
  infrastructure_subnet_id       = local.container_apps_subnet_id
  internal_load_balancer_enabled = var.internal_load_balancer_enabled

  workload_profiles = [
    {
      name                  = var.workload_profile_name
      workload_profile_type = var.workload_profile_type
      minimum_count         = var.workload_profile_min_count
      maximum_count         = var.workload_profile_max_count
    },
    # Consumption profile for lightweight workloads (matches N2A setup)
    {
      name                  = "Consumption"
      workload_profile_type = "Consumption"
      minimum_count         = null
      maximum_count         = null
    }
  ]

  # Storage mount for Azure Files
  storage_mounts = concat(
    [
      {
        name         = "uploads-${var.environment}"
        share_name   = "uploads-${var.environment}"
        account_name = module.storage.storage_account_name
        account_key  = module.storage.storage_account_primary_access_key
        access_mode  = "ReadWrite"
      }
    ],
    var.enable_meilisearch_container ? [
      {
        name         = "meilisearch-data-${var.environment}"
        share_name   = "meilisearch-data-${var.environment}"
        account_name = module.storage.storage_account_name
        account_key  = module.storage.storage_account_primary_access_key
        access_mode  = "ReadWrite"
      }
    ] : []
  )
}

module "container_app" {
  source = "./modules/container-app"

  name                         = local.container_app_name
  resource_group_name          = azurerm_resource_group.main.name
  container_app_environment_id = module.container_apps_environment.id
  workload_profile_name        = var.workload_profile_name
  tags                         = local.common_tags

  # Use UAMI for Key Vault access (created before Container App)
  identity_type              = "SystemAssigned, UserAssigned"
  user_assigned_identity_ids = [azurerm_user_assigned_identity.container_app.id]

  # Use UAMI for ACR pull
  registry_server   = local.librechat_image_uses_acr ? local.acr_login_server : null
  registry_identity = local.librechat_image_uses_acr ? azurerm_user_assigned_identity.container_app.id : null

  # RAG API mode
  enable_rag_sidecar = var.enable_rag_sidecar

  # Ingress configuration
  ingress = {
    external_enabled = true
    target_port      = var.first_deploy ? 80 : 3080
    transport        = "auto"
    traffic_weight = [{
      latest_revision = true
      percentage      = 100
    }]
    custom_domain = var.domain != "" ? {
      name           = var.domain
      certificate_id = var.custom_domain_certificate_id
    } : null
    sticky_sessions = {
      affinity = "sticky"
    }
    additional_port_mappings = var.enable_rag_sidecar ? [
      {
        external     = false
        target_port  = 8000
        exposed_port = 8000
      }
    ] : []
  }

  # LibreChat container configuration
  librechat_container = {
    image  = var.librechat_image
    name   = "conpaichat"
    cpu    = var.librechat_cpu
    memory = var.librechat_memory

    env = concat(
      [
        { name = "OPENID_CALLBACK_URL", value = var.openid_callback_url },
        { name = "OPENID_SCOPE", value = var.openid_scope },
        { name = "OPENID_ISSUER", value = var.openid_issuer },
        { name = "OPENID_CLIENT_ID", value = var.openid_client_id },
        { name = "AZURE_OPENAI_BASEURL", value = var.azure_openai_baseurl },
        { name = "GCP_VERTEXAI_BASEURL", value = var.gcp_vertexai_baseurl },
        { name = "ALLOW_REGISTRATION", value = var.allow_registration ? "TRUE" : "FALSE" },
        { name = "ALLOW_EMAIL_LOGIN", value = var.allow_email_login ? "TRUE" : "FALSE" },
        { name = "ALLOW_SOCIAL_LOGIN", value = var.allow_social_login ? "TRUE" : "FALSE" },
        { name = "DOMAIN_CLIENT", value = "https://${var.domain}" },
        { name = "DOMAIN_SERVER", value = "https://${var.domain}" },
        { name = "HOST", value = "0.0.0.0" },
        { name = "NODE_EXTRA_CA_CERTS", value = "/app/paychex-root.pem" },
        { name = "RAG_API_URL", value = local.rag_api_internal_url },
        { name = "RAG_USE_FULL_CONTEXT", value = "TRUE" },
        { name = "CONSOLE_JSON", value = var.console_json ? "TRUE" : "FALSE" },
        { name = "DEBUG_LOGGING", value = var.debug_logging ? "TRUE" : "FALSE" },
      ],
      var.enable_meilisearch_container ? [
        { name = "MEILI_HOST", value = local.meilisearch_internal_url },
        { name = "SEARCH", value = "true" },
      ] : []
    )

    secret_env = concat(
      [
        { name = "MONGO_URI", secret_name = "mongo-connection-string" },
        { name = "OPENID_SESSION_SECRET", secret_name = "openid-session-secret" },
        { name = "OPENID_CLIENT_SECRET", secret_name = "client-secret" },
        { name = "JWT_SECRET", secret_name = "jwt-secret" },
        { name = "JWT_REFRESH_SECRET", secret_name = "jwt-refresh-secret" },
        { name = "CREDS_KEY", secret_name = "creds-key" },
        { name = "CREDS_IV", secret_name = "creds-iv" },
        { name = "AZURE_OPENAI_API_KEY", secret_name = "maas-api-key" },
        { name = "GCP_VERTEXAI_API_KEY", secret_name = "maas-api-key" },
        { name = "TAVILY_API_KEY", secret_name = "tavily-api-key" },
      ],
      var.enable_meilisearch_container ? [
        { name = "MEILI_MASTER_KEY", secret_name = "meilisearch-master-key" },
      ] : []
    )

    volume_mounts = [
      { name = "uploads", path = "/app/uploads" },
      { name = "uploads", path = "/app/client/public/images" },
    ]
  }

  # RAG API container configuration
  rag_api_container = {
    image  = var.rag_api_image
    name   = "conpairag"
    cpu    = var.rag_api_cpu
    memory = var.rag_api_memory

    env = [
      { name = "RAG_AZURE_OPENAI_ENDPOINT", value = var.rag_azure_openai_endpoint },
      { name = "RAG_AZURE_OPENAI_API_VERSION", value = var.rag_azure_openai_api_version },
      { name = "EMBEDDINGS_PROVIDER", value = var.embeddings_provider },
      { name = "EMBEDDINGS_MODEL", value = var.embeddings_model },
      { name = "RAG_PORT", value = "8000" },
      { name = "RAG_HOST", value = "0.0.0.0" },
      { name = "COLLECTION_NAME", value = "ragcollection" },
      { name = "ATLAS_SEARCH_INDEX", value = "vectorindex" },
      { name = "VECTOR_DB_TYPE", value = "atlas-mongo" },
      { name = "REQUESTS_CA_BUNDLE", value = "/etc/ssl/certs/ca-certificates.crt" },
      { name = "CURL_CA_BUNDLE", value = "/app/paychex-root.pem" },
      { name = "RAG_USE_FULL_CONTEXT", value = "TRUE" },
      { name = "DEBUG_RAG_API", value = var.debug_logging ? "TRUE" : "FALSE" },
    ]

    secret_env = [
      { name = "RAG_AZURE_OPENAI_API_KEY", secret_name = "maas-api-key" },
      { name = "ATLAS_MONGO_DB_URI", secret_name = "rag-mongo-connection-string" },
    ]

    volume_mounts = [
      { name = "uploads", path = "/app/uploads" },
    ]
  }

  # MongoDB sidecar container (sandbox/dev only)
  # Note: Using ephemeral storage because Azure Files SMB doesn't support MongoDB's WiredTiger storage engine
  mongodb_container = {
    enabled       = var.enable_mongodb_container
    image         = var.mongodb_image
    name          = "mongodb"
    cpu           = var.mongodb_cpu
    memory        = var.mongodb_memory
    env           = []
    volume_mounts = [] # Ephemeral storage - data lost on restart
  }

  # MeiliSearch sidecar container (sandbox/dev only)
  meilisearch_container = {
    enabled = var.enable_meilisearch_container
    image   = var.meilisearch_image
    name    = "meilisearch"
    cpu     = var.meilisearch_cpu
    memory  = var.meilisearch_memory
    env = [
      { name = "MEILI_ENV", value = "production" },
      { name = "MEILI_NO_ANALYTICS", value = "true" },
    ]
    secret_env = var.enable_meilisearch_container ? [
      { name = "MEILI_MASTER_KEY", secret_name = "meilisearch-master-key" }
    ] : []
    volume_mounts = var.enable_meilisearch_container ? [
      { name = "meilisearch-data", path = "/meili_data" }
    ] : []
  }

  # Scaling configuration
  scale = {
    min_replicas = var.librechat_min_replicas
    max_replicas = var.librechat_max_replicas
    rules = [
      {
        name = "httpscalingrule"
        custom = {
          type = "http"
          metadata = {
            concurrentRequests = tostring(var.librechat_concurrent_requests)
          }
        }
      }
    ]
  }

  # Health probes
  # first_deploy=true: disables health probes (placeholder images don't have /health endpoint)
  enable_health_probes = !var.first_deploy && var.enable_health_probes
  readiness_probe = (!var.first_deploy && var.enable_health_probes) ? {
    path              = "/health"
    port              = 3080
    initial_delay     = var.readiness_probe_initial_delay
    period            = var.readiness_probe_period
    timeout           = 3
    success_threshold = 1
    failure_threshold = 3
  } : null

  liveness_probe = (!var.first_deploy && var.enable_health_probes) ? {
    path              = "/health"
    port              = 3080
    initial_delay     = var.liveness_probe_initial_delay
    period            = var.liveness_probe_period
    timeout           = 5
    failure_threshold = 5
  } : null

  # Key Vault secrets (UAMI has access before Container App creation)
  secrets = concat(
    [
      { name = "openid-session-secret", key_vault_secret_url = "${azurerm_key_vault.main.vault_uri}secrets/${upper(var.environment)}-OPENID-SESSION-SECRET", identity = azurerm_user_assigned_identity.container_app.id },
      { name = "creds-iv", key_vault_secret_url = "${azurerm_key_vault.main.vault_uri}secrets/${upper(var.environment)}-CREDS-IV", identity = azurerm_user_assigned_identity.container_app.id },
      { name = "creds-key", key_vault_secret_url = "${azurerm_key_vault.main.vault_uri}secrets/${upper(var.environment)}-CREDS-KEY", identity = azurerm_user_assigned_identity.container_app.id },
      { name = "jwt-secret", key_vault_secret_url = "${azurerm_key_vault.main.vault_uri}secrets/${upper(var.environment)}-JWT-SECRET", identity = azurerm_user_assigned_identity.container_app.id },
      { name = "jwt-refresh-secret", key_vault_secret_url = "${azurerm_key_vault.main.vault_uri}secrets/${upper(var.environment)}-JWT-REFRESH-SECRET", identity = azurerm_user_assigned_identity.container_app.id },
      { name = "mongo-connection-string", key_vault_secret_url = "${azurerm_key_vault.main.vault_uri}secrets/${upper(var.environment)}-MONGO-CONNECTION-STRING", identity = azurerm_user_assigned_identity.container_app.id },
      { name = "rag-mongo-connection-string", key_vault_secret_url = "${azurerm_key_vault.main.vault_uri}secrets/${upper(var.environment)}-RAG-API-MONGO-CONNECTION-STRING", identity = azurerm_user_assigned_identity.container_app.id },
      { name = "client-secret", key_vault_secret_url = "${azurerm_key_vault.main.vault_uri}secrets/${upper(var.environment)}-OPENID-CLIENT-SECRET", identity = azurerm_user_assigned_identity.container_app.id },
      { name = "maas-api-key", key_vault_secret_url = "${azurerm_key_vault.main.vault_uri}secrets/${upper(var.environment)}-MAAS-API-KEY", identity = azurerm_user_assigned_identity.container_app.id },
      { name = "tavily-api-key", key_vault_secret_url = "${azurerm_key_vault.main.vault_uri}secrets/${upper(var.environment)}-TAVILY-API-KEY", identity = azurerm_user_assigned_identity.container_app.id },
    ],
    var.enable_meilisearch_container ? [
      { name = "meilisearch-master-key", key_vault_secret_url = "${azurerm_key_vault.main.vault_uri}secrets/${upper(var.environment)}-MEILISEARCH-MASTER-KEY", identity = azurerm_user_assigned_identity.container_app.id },
    ] : []
  )

  # Ensure Key Vault secrets and access policy exist before Container App
  depends_on = [
    azurerm_key_vault_access_policy.container_app_uami,
    azurerm_key_vault_secret.secrets,
  ]

  # Volume configuration
  volumes = concat(
    [
      {
        name         = "uploads"
        storage_name = "uploads-${var.environment}"
        storage_type = "AzureFile"
      }
    ],
    var.enable_meilisearch_container ? [
      {
        name         = "meilisearch-data"
        storage_name = "meilisearch-data-${var.environment}"
        storage_type = "AzureFile"
      }
    ] : []
  )
}

data "azurerm_client_config" "current" {}

# =============================================================================
# Standalone RAG API Container App (N2A/N1/Prod)
# Deployed as independent app in same Container Apps Environment
# For sandbox, RAG runs as sidecar inside the main container app instead
# =============================================================================

resource "azurerm_container_app" "rag_api" {
  count                        = var.enable_rag_sidecar ? 0 : 1
  name                         = local.rag_container_app_name
  resource_group_name          = azurerm_resource_group.main.name
  container_app_environment_id = module.container_apps_environment.id
  revision_mode                = "Single"
  workload_profile_name        = var.workload_profile_name
  tags                         = local.common_tags

  identity {
    type         = "SystemAssigned, UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.container_app.id]
  }

  dynamic "registry" {
    for_each = local.rag_api_image_uses_acr ? [1] : []
    content {
      server   = local.acr_login_server
      identity = azurerm_user_assigned_identity.container_app.id
    }
  }

  ingress {
    external_enabled = false
    target_port      = var.first_deploy ? 80 : 8000
    transport        = "auto"
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  secret {
    name                = "maas-api-key"
    key_vault_secret_id = "${azurerm_key_vault.main.vault_uri}secrets/${upper(var.environment)}-MAAS-API-KEY"
    identity            = azurerm_user_assigned_identity.container_app.id
  }

  secret {
    name                = "rag-mongo-connection-string"
    key_vault_secret_id = "${azurerm_key_vault.main.vault_uri}secrets/${upper(var.environment)}-RAG-API-MONGO-CONNECTION-STRING"
    identity            = azurerm_user_assigned_identity.container_app.id
  }

  template {
    min_replicas = var.rag_api_min_replicas
    max_replicas = var.rag_api_max_replicas

    container {
      name   = "conpairag"
      image  = var.rag_api_image
      cpu    = var.rag_api_cpu
      memory = var.rag_api_memory

      env {
        name  = "RAG_AZURE_OPENAI_ENDPOINT"
        value = var.rag_azure_openai_endpoint
      }
      env {
        name  = "RAG_AZURE_OPENAI_API_VERSION"
        value = var.rag_azure_openai_api_version
      }
      env {
        name  = "EMBEDDINGS_PROVIDER"
        value = var.embeddings_provider
      }
      env {
        name  = "EMBEDDINGS_MODEL"
        value = var.embeddings_model
      }
      env {
        name  = "RAG_PORT"
        value = "8000"
      }
      env {
        name  = "RAG_HOST"
        value = "0.0.0.0"
      }
      env {
        name  = "COLLECTION_NAME"
        value = "ragcollection"
      }
      env {
        name  = "ATLAS_SEARCH_INDEX"
        value = "vectorindex"
      }
      env {
        name  = "VECTOR_DB_TYPE"
        value = "atlas-mongo"
      }
      env {
        name  = "REQUESTS_CA_BUNDLE"
        value = "/etc/ssl/certs/ca-certificates.crt"
      }
      env {
        name  = "CURL_CA_BUNDLE"
        value = "/app/paychex-root.pem"
      }
      env {
        name  = "RAG_USE_FULL_CONTEXT"
        value = "TRUE"
      }
      env {
        name  = "DEBUG_RAG_API"
        value = var.debug_logging ? "TRUE" : "FALSE"
      }

      # Secret environment variables
      env {
        name        = "RAG_AZURE_OPENAI_API_KEY"
        secret_name = "maas-api-key"
      }
      env {
        name        = "ATLAS_MONGO_DB_URI"
        secret_name = "rag-mongo-connection-string"
      }

      volume_mounts {
        name = "uploads"
        path = "/app/uploads"
      }
    }

    volume {
      name         = "uploads"
      storage_name = "uploads-${var.environment}"
      storage_type = "AzureFile"
    }
  }

  # Terraform manages infrastructure; CI/CD manages container images
  lifecycle {
    ignore_changes = [
      template[0].container[0].image,
      template[0].revision_suffix,
    ]
  }

  depends_on = [
    azurerm_key_vault_access_policy.container_app_uami,
    azurerm_key_vault_secret.secrets,
  ]
}

# Provides a fixed internal IP that DNS points to, solving the problem of
# Container Apps URLs changing when the environment is recreated.

data "azurerm_subnet" "app_gateway" {
  count                = var.enable_app_gateway ? 1 : 0
  name                 = var.app_gateway_subnet_name
  virtual_network_name = var.existing_vnet_name
  resource_group_name  = var.existing_vnet_resource_group
}

module "application_gateway" {
  count  = var.enable_app_gateway ? 1 : 0
  source = "./modules/application-gateway"

  name                = "appgw-${local.name_prefix}-${local.location_short}-${var.environment}-001"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  tags                = local.common_tags

  # Network - use existing dedicated App Gateway subnet
  # IP is calculated dynamically from subnet CIDR using offset (e.g., offset 10 in 10.72.82.0/24 = 10.72.82.10)
  subnet_id          = data.azurerm_subnet.app_gateway[0].id
  private_ip_address = cidrhost(data.azurerm_subnet.app_gateway[0].address_prefixes[0], var.app_gateway_private_ip_offset)

  # Scaling
  min_capacity = var.app_gateway_min_capacity
  max_capacity = var.app_gateway_max_capacity

  # SSL configuration
  # first_deploy=true: disables SSL (cert must be manually added to Key Vault first)
  enable_ssl                          = !var.first_deploy && var.app_gateway_enable_ssl
  ssl_certificate_name                = var.app_gateway_ssl_certificate_name
  ssl_certificate_key_vault_secret_id = "${azurerm_key_vault.main.vault_uri}secrets/${var.app_gateway_ssl_certificate_name}"
  key_vault_id                        = azurerm_key_vault.main.id
  key_vault_enable_rbac               = var.key_vault_enable_rbac_authorization
  rbac_propagation_wait_seconds       = var.key_vault_rbac_propagation_wait_seconds
  tenant_id                           = data.azurerm_client_config.current.tenant_id

  # Backend - points to Container Apps Environment static IP
  backend_ip_address = module.container_apps_environment.static_ip_address
  backend_host_name  = module.container_app.fqdn

  # Listener - custom domain for incoming requests
  listener_host_name = var.app_gateway_host_name

  depends_on = [
    module.container_apps_environment,
    module.container_app
  ]
}

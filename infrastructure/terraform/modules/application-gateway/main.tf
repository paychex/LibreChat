# Application Gateway Module - Stable internal endpoint for DNS, fronting Container Apps

resource "azurerm_user_assigned_identity" "appgw" {
  count               = var.enable_ssl ? 1 : 0
  name                = "id-${var.name}"
  location            = var.location
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

resource "azurerm_key_vault_access_policy" "appgw" {
  count = var.enable_ssl && !var.key_vault_enable_rbac ? 1 : 0

  key_vault_id = var.key_vault_id
  tenant_id    = var.tenant_id
  object_id    = azurerm_user_assigned_identity.appgw[0].principal_id

  secret_permissions      = ["Get", "List"]
  certificate_permissions = ["Get", "List"]
}

# RBAC mode: grant App Gateway identity access to KV secrets and certificates
resource "azurerm_role_assignment" "appgw_kv_secrets_user" {
  count                = var.enable_ssl && var.key_vault_enable_rbac ? 1 : 0
  scope                = var.key_vault_id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.appgw[0].principal_id
}

resource "azurerm_role_assignment" "appgw_kv_certificate_user" {
  count                = var.enable_ssl && var.key_vault_enable_rbac ? 1 : 0
  scope                = var.key_vault_id
  role_definition_name = "Key Vault Certificate User"
  principal_id         = azurerm_user_assigned_identity.appgw[0].principal_id
}

resource "time_sleep" "wait_for_kv_rbac_propagation" {
  count           = var.enable_ssl && var.key_vault_enable_rbac ? 1 : 0
  create_duration = "${var.rbac_propagation_wait_seconds}s"

  depends_on = [
    azurerm_role_assignment.appgw_kv_secrets_user,
    azurerm_role_assignment.appgw_kv_certificate_user
  ]
}

resource "azurerm_application_gateway" "this" {
  name                = var.name
  location            = var.location
  resource_group_name = var.resource_group_name
  tags                = var.tags

  # Standard_v2 SKU - supports autoscaling, no WAF
  sku {
    name = "Standard_v2"
    tier = "Standard_v2"
  }

  # Autoscaling configuration (cost-effective for internal apps)
  autoscale_configuration {
    min_capacity = var.min_capacity
    max_capacity = var.max_capacity
  }

  # Gateway IP configuration (subnet association)
  gateway_ip_configuration {
    name      = "gateway-ip-config"
    subnet_id = var.subnet_id
  }

  # Frontend - Private IP Only (Internal)
  frontend_ip_configuration {
    name                          = "private-frontend"
    subnet_id                     = var.subnet_id
    private_ip_address_allocation = "Static"
    private_ip_address            = var.private_ip_address
  }

  frontend_port {
    name = var.enable_ssl ? "https-port" : "http-port"
    port = var.enable_ssl ? 443 : 80
  }

  # SSL Certificate from Key Vault (only when SSL enabled)
  dynamic "identity" {
    for_each = var.enable_ssl ? [1] : []
    content {
      type         = "UserAssigned"
      identity_ids = [azurerm_user_assigned_identity.appgw[0].id]
    }
  }

  dynamic "ssl_certificate" {
    for_each = var.enable_ssl ? [1] : []
    content {
      name                = var.ssl_certificate_name
      key_vault_secret_id = var.ssl_certificate_key_vault_secret_id
    }
  }

  # Backend - Points to Container Apps Environment
  backend_address_pool {
    name         = "container-apps-backend"
    ip_addresses = [var.backend_ip_address]
  }

  backend_http_settings {
    name                                = "https-backend-settings"
    port                                = 443
    protocol                            = "Https"
    cookie_based_affinity               = "Enabled"
    affinity_cookie_name                = "ApplicationGatewayAffinity"
    request_timeout                     = 60
    pick_host_name_from_backend_address = false
    host_name                           = var.backend_host_name
    probe_name                          = "health-probe"

    # Trust the backend certificate (Container Apps uses Microsoft-signed cert)
    trusted_root_certificate_names = []
  }

  # Health Probe - Checks Container App Health Endpoint
  probe {
    name                                      = "health-probe"
    protocol                                  = "Https"
    path                                      = "/health"
    interval                                  = 30
    timeout                                   = 30
    unhealthy_threshold                       = 3
    pick_host_name_from_backend_http_settings = true
    match {
      status_code = ["200-399"]
    }
  }

  # HTTP/HTTPS Listener - Accepts Traffic on Custom Domain
  http_listener {
    name                           = var.enable_ssl ? "https-listener" : "http-listener"
    frontend_ip_configuration_name = "private-frontend"
    frontend_port_name             = var.enable_ssl ? "https-port" : "http-port"
    protocol                       = var.enable_ssl ? "Https" : "Http"
    ssl_certificate_name           = var.enable_ssl ? var.ssl_certificate_name : null
    host_name                      = var.listener_host_name
    require_sni                    = var.enable_ssl ? true : false
  }

  # Routing Rule - Connect Listener to Backend
  request_routing_rule {
    name                       = "routing-rule"
    priority                   = 100
    rule_type                  = "Basic"
    http_listener_name         = var.enable_ssl ? "https-listener" : "http-listener"
    backend_address_pool_name  = "container-apps-backend"
    backend_http_settings_name = "https-backend-settings"
  }

  # Ensure KV access is granted before creating App Gateway (supports access policy and RBAC modes)
  depends_on = [
    azurerm_key_vault_access_policy.appgw,
    time_sleep.wait_for_kv_rbac_propagation
  ]

  lifecycle {
    # Ignore changes to tags that may be added by Azure policies
    ignore_changes = [
      tags["CreatedOnDate"],
    ]
  }
}

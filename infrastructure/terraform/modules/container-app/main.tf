resource "azurerm_container_app" "this" {
  name                         = var.name
  resource_group_name          = var.resource_group_name
  container_app_environment_id = var.container_app_environment_id
  revision_mode                = var.revision_mode
  workload_profile_name        = var.workload_profile_name

  tags = var.tags

  identity {
    type         = var.identity_type
    identity_ids = var.identity_type == "UserAssigned" || var.identity_type == "SystemAssigned, UserAssigned" ? var.user_assigned_identity_ids : null
  }

  # Registry configuration
  dynamic "registry" {
    for_each = var.registry_server != null ? [1] : []
    content {
      server               = var.registry_server
      username             = var.registry_username
      password_secret_name = var.registry_password_secret_name
      identity             = var.registry_identity == "system" ? "System" : var.registry_identity
    }
  }

  # Ingress configuration
  dynamic "ingress" {
    for_each = var.ingress != null ? [var.ingress] : []
    content {
      external_enabled           = ingress.value.external_enabled
      target_port                = ingress.value.target_port
      transport                  = ingress.value.transport
      allow_insecure_connections = ingress.value.allow_insecure

      dynamic "traffic_weight" {
        for_each = ingress.value.traffic_weight
        content {
          latest_revision = traffic_weight.value.latest_revision
          revision_suffix = traffic_weight.value.revision_suffix
          percentage      = traffic_weight.value.percentage
          label           = traffic_weight.value.label
        }
      }

      dynamic "ip_security_restriction" {
        for_each = ingress.value.ip_security_restrictions
        content {
          name             = ip_security_restriction.value.name
          action           = ip_security_restriction.value.action
          ip_address_range = ip_security_restriction.value.ip_address_range
          description      = ip_security_restriction.value.description
        }
      }
    }
  }

  # Secrets from Key Vault
  dynamic "secret" {
    for_each = { for s in var.secrets : s.name => s }
    content {
      name                = secret.value.name
      key_vault_secret_id = secret.value.key_vault_secret_url
      identity            = secret.value.identity == "system" ? "System" : secret.value.identity
      value               = secret.value.value
    }
  }

  template {
    min_replicas = var.scale.min_replicas
    max_replicas = var.scale.max_replicas

    # LibreChat container
    container {
      name   = var.librechat_container.name
      image  = var.librechat_container.image
      cpu    = var.librechat_container.cpu
      memory = var.librechat_container.memory

      command = var.librechat_container.command
      args    = var.librechat_container.args

      # Regular environment variables
      dynamic "env" {
        for_each = var.librechat_container.env
        content {
          name  = env.value.name
          value = env.value.value
        }
      }

      # Secret environment variables
      dynamic "env" {
        for_each = var.librechat_container.secret_env
        content {
          name        = env.value.name
          secret_name = env.value.secret_name
        }
      }

      # Volume mounts
      dynamic "volume_mounts" {
        for_each = var.librechat_container.volume_mounts
        content {
          name = volume_mounts.value.name
          path = volume_mounts.value.path
        }
      }

      # Readiness probe
      dynamic "readiness_probe" {
        for_each = var.enable_health_probes && var.readiness_probe != null ? [var.readiness_probe] : []
        content {
          transport               = readiness_probe.value.transport
          port                    = readiness_probe.value.port
          path                    = readiness_probe.value.path
          initial_delay           = readiness_probe.value.initial_delay
          interval_seconds        = readiness_probe.value.period
          timeout                 = readiness_probe.value.timeout
          success_count_threshold = readiness_probe.value.success_threshold
          failure_count_threshold = readiness_probe.value.failure_threshold
        }
      }

      # Liveness probe
      dynamic "liveness_probe" {
        for_each = var.enable_health_probes && var.liveness_probe != null ? [var.liveness_probe] : []
        content {
          transport               = liveness_probe.value.transport
          port                    = liveness_probe.value.port
          path                    = liveness_probe.value.path
          initial_delay           = liveness_probe.value.initial_delay
          interval_seconds        = liveness_probe.value.period
          timeout                 = liveness_probe.value.timeout
          failure_count_threshold = liveness_probe.value.failure_threshold
        }
      }

      # Startup probe
      dynamic "startup_probe" {
        for_each = var.enable_health_probes && var.startup_probe != null ? [var.startup_probe] : []
        content {
          transport               = startup_probe.value.transport
          port                    = startup_probe.value.port
          path                    = startup_probe.value.path
          initial_delay           = startup_probe.value.initial_delay
          interval_seconds        = startup_probe.value.period
          timeout                 = startup_probe.value.timeout
          failure_count_threshold = startup_probe.value.failure_threshold
        }
      }
    }

    # RAG API container (sidecar mode only - standalone mode uses separate container app)
    dynamic "container" {
      for_each = var.enable_rag_sidecar ? [var.rag_api_container] : []
      content {
        name   = container.value.name
        image  = container.value.image
        cpu    = container.value.cpu
        memory = container.value.memory

        command = container.value.command
        args    = container.value.args

        # Regular environment variables
        dynamic "env" {
          for_each = container.value.env
          content {
            name  = env.value.name
            value = env.value.value
          }
        }

        # Secret environment variables
        dynamic "env" {
          for_each = container.value.secret_env
          content {
            name        = env.value.name
            secret_name = env.value.secret_name
          }
        }

        # Volume mounts
        dynamic "volume_mounts" {
          for_each = container.value.volume_mounts
          content {
            name = volume_mounts.value.name
            path = volume_mounts.value.path
          }
        }
      }
    }

    # MongoDB sidecar container (optional - for sandbox/dev)
    dynamic "container" {
      for_each = var.mongodb_container.enabled ? [1] : []
      content {
        name   = var.mongodb_container.name
        image  = var.mongodb_container.image
        cpu    = var.mongodb_container.cpu
        memory = var.mongodb_container.memory

        dynamic "env" {
          for_each = var.mongodb_container.env
          content {
            name  = env.value.name
            value = env.value.value
          }
        }

        dynamic "volume_mounts" {
          for_each = var.mongodb_container.volume_mounts
          content {
            name = volume_mounts.value.name
            path = volume_mounts.value.path
          }
        }
      }
    }

    # MeiliSearch sidecar container (optional - for sandbox/dev)
    dynamic "container" {
      for_each = var.meilisearch_container.enabled ? [1] : []
      content {
        name   = var.meilisearch_container.name
        image  = var.meilisearch_container.image
        cpu    = var.meilisearch_container.cpu
        memory = var.meilisearch_container.memory

        dynamic "env" {
          for_each = var.meilisearch_container.env
          content {
            name  = env.value.name
            value = env.value.value
          }
        }

        dynamic "env" {
          for_each = var.meilisearch_container.secret_env
          content {
            name        = env.value.name
            secret_name = env.value.secret_name
          }
        }

        dynamic "volume_mounts" {
          for_each = var.meilisearch_container.volume_mounts
          content {
            name = volume_mounts.value.name
            path = volume_mounts.value.path
          }
        }
      }
    }

    # Volumes
    dynamic "volume" {
      for_each = var.volumes
      content {
        name         = volume.value.name
        storage_name = volume.value.storage_name
        storage_type = volume.value.storage_type
      }
    }

    # HTTP scaling rules
    dynamic "http_scale_rule" {
      for_each = [for r in var.scale.rules : r if r.http != null]
      content {
        name                = http_scale_rule.value.name
        concurrent_requests = lookup(http_scale_rule.value.http.metadata, "concurrentRequests", "10")
      }
    }

    # Custom scaling rules
    dynamic "custom_scale_rule" {
      for_each = [for r in var.scale.rules : r if r.custom != null]
      content {
        name             = custom_scale_rule.value.name
        custom_rule_type = custom_scale_rule.value.custom.type
        metadata         = custom_scale_rule.value.custom.metadata
      }
    }

    # Azure queue scaling rules
    dynamic "azure_queue_scale_rule" {
      for_each = [for r in var.scale.rules : r if r.azure_queue != null]
      content {
        name         = azure_queue_scale_rule.value.name
        queue_name   = azure_queue_scale_rule.value.azure_queue.queue_name
        queue_length = azure_queue_scale_rule.value.azure_queue.queue_length

        dynamic "authentication" {
          for_each = azure_queue_scale_rule.value.azure_queue.auth
          content {
            secret_name       = authentication.value.secret_name
            trigger_parameter = authentication.value.trigger_parameter
          }
        }
      }
    }

    # TCP scaling rules
    dynamic "tcp_scale_rule" {
      for_each = [for r in var.scale.rules : r if r.tcp != null]
      content {
        name                = tcp_scale_rule.value.name
        concurrent_requests = lookup(tcp_scale_rule.value.tcp.metadata, "concurrentRequests", "10")
      }
    }
  }

  # Terraform manages infrastructure; CI/CD manages container images
  # Cover all possible container indices (non-existent paths silently ignored)
  lifecycle {
    ignore_changes = [
      template[0].container[0].image,
      template[0].container[1].image,
      template[0].container[2].image,
      template[0].container[3].image,
      template[0].revision_suffix,
    ]
  }
}

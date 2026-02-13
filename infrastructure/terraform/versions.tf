terraform {
  required_version = ">= 1.9.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.14"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Remote state storage in Azure
  # Backend config is passed via -backend-config in pipeline
  backend "azurerm" {
    # These values are provided via backend config files or CLI args:
    # - resource_group_name
    # - storage_account_name  
    # - container_name
    # - key (state file name, e.g., "n1.tfstate", "n2a.tfstate", "prod.tfstate")
    # - subscription_id (for the state storage subscription)
  }
}

# LibreChat Azure Infrastructure

This directory contains Terraform configurations to deploy LibreChat to Azure Container Apps.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Azure Subscription                                 │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        Resource Group                                  │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐   │  │
│  │  │   Key Vault     │  │ Storage Account │  │ Log Analytics       │   │  │
│  │  │   (Secrets)     │  │ (Azure Files)   │  │ (Monitoring)        │   │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘   │  │
│  │                                                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │              Container Apps Environment                          │  │  │
│  │  │  ┌─────────────────────────────────────────────────────────┐   │  │  │
│  │  │  │                   Container App                          │   │  │  │
│  │  │  │  ┌───────────────────┐  ┌───────────────────┐          │   │  │  │
│  │  │  │  │   LibreChat       │  │    RAG API        │          │   │  │  │
│  │  │  │  │   (Port 3080)     │  │    (Port 8000)    │          │   │  │  │
│  │  │  │  └───────────────────┘  └───────────────────┘          │   │  │  │
│  │  │  │                                                          │   │  │  │
│  │  │  │  ┌─────────────────────────────────────────────────┐   │   │  │  │
│  │  │  │  │  Azure Files Volume Mount (/app/uploads)        │   │   │  │  │
│  │  │  │  └─────────────────────────────────────────────────┘   │   │  │  │
│  │  │  └─────────────────────────────────────────────────────────┘   │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **Azure CLI** installed and authenticated
2. **Terraform** >= 1.9.0
3. **Azure subscription** with appropriate permissions
4. **Existing secrets** in Azure Key Vault (see [Secrets Setup](#secrets-setup))

## Directory Structure

```
infrastructure/terraform/
├── main.tf                  # Main configuration
├── variables.tf             # Variable definitions
├── outputs.tf               # Output definitions
├── providers.tf             # Provider configuration
├── versions.tf              # Version constraints
├── locals.tf                # Local values
├── backends/                # Backend configuration for remote state
│   ├── n1.tfbackend        # N1 state configuration
│   ├── n2a.tfbackend       # N2A state configuration
│   └── prod.tfbackend      # Production state configuration
├── environments/            # Environment-specific configurations
│   ├── n1.tfvars           # Development environment
│   ├── n2a.tfvars          # Staging/UAT environment
│   └── prod.tfvars         # Production environment
└── modules/
    ├── storage/            # Storage Account module
    ├── container-apps-environment/  # Container Apps Environment module
    └── container-app/      # Container App module
```

## State Management

Terraform state is stored remotely in Azure Storage:

| Environment | Subscription | State File |
|-------------|--------------|------------|
| N1 | `819386da-...` | `librechat/n1.tfstate` |
| N2A | `819386da-...` | `librechat/n2a.tfstate` |
| Prod | `9c0bd682-...` | `librechat/prod.tfstate` |

State storage account: `stpaaborterraform001` in resource group `rg-terraform-state`

> **Note:** This Terraform configuration replaces the previous `az_container_app_definitions/` YAML-based deployment. Key Vault is expected to already exist with secrets pre-populated.

## Deployment

> ⚠️ **All deployments MUST be done through the CI/CD pipeline.** Local `terraform apply` is disabled for security and compliance reasons.

### Deploying via GitHub Actions

1. **Go to Actions tab** in GitHub
2. **Select "Terraform Infrastructure"** workflow
3. **Click "Run workflow"**
4. **Select options:**
   - **Environment:** `n1`, `n2a`, or `prod`
   - **Action:** `plan`, `apply`, or `destroy`
5. **Review and approve** (required for `apply` and `destroy`)

### Pull Request Workflow

1. Create a branch with infrastructure changes
2. Open a Pull Request to `main`
3. Terraform will automatically run `plan` for all environments
4. Review the plan output in PR comments
5. After merge, manually trigger `apply` via workflow dispatch

### Local Development (Plan Only)

For local validation and planning only:

```bash
cd infrastructure/terraform
terraform init
terraform validate
terraform plan -var-file=environments/n1.tfvars  # Plan only, no apply
```

## Secrets Setup

Before deploying, ensure the following secrets exist in your Key Vault:

| Secret Name | Description |
|-------------|-------------|
| `{ENV}-OPENID-SESSION-SECRET` | OpenID session secret |
| `{ENV}-OPENID-CLIENT-SECRET` | OpenID client secret |
| `{ENV}-JWT-SECRET` | JWT signing secret |
| `{ENV}-JWT-REFRESH-SECRET` | JWT refresh token secret |
| `{ENV}-CREDS-KEY` | Credentials encryption key |
| `{ENV}-CREDS-IV` | Credentials encryption IV |
| `{ENV}-MONGO-CONNECTION-STRING` | MongoDB connection string |
| `{ENV}-RAG-API-MONGO-CONNECTION-STRING` | RAG API MongoDB connection string |
| `{ENV}-MAAS-API-KEY` | MaaS API key (Azure OpenAI) |
| `{ENV}-TAVILY-API-KEY` | Tavily API key (optional) |

Where `{ENV}` is one of: `N1`, `N2A`, `PROD`

## Configuration Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `subscription_id` | Azure Subscription ID | `"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"` |
| `environment` | Environment name | `"n1"`, `"n2a"`, `"prod"` |
| `librechat_image` | LibreChat container image | `"acr.azurecr.io/librechat:latest"` |
| `rag_api_image` | RAG API container image | `"acr.azurecr.io/rag_api:latest"` |
| `domain` | Custom domain | `"play.ai.example.com"` |
| `openid_issuer` | OpenID issuer URL | `"https://login.microsoftonline.com/{tenant}/v2.0/"` |
| `openid_client_id` | OpenID client ID | `"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"` |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `location` | `"East US"` | Azure region |
| `librechat_cpu` | `1` | CPU cores for LibreChat |
| `librechat_memory` | `"2Gi"` | Memory for LibreChat |
| `librechat_min_replicas` | `1` | Minimum replicas |
| `librechat_max_replicas` | `3` | Maximum replicas |
| `allow_registration` | `false` | Allow user registration |
| `allow_email_login` | `false` | Allow email login |
| `allow_social_login` | `true` | Allow social login |

## Remote State (Recommended for Team Use)

Uncomment and configure the backend in `versions.tf`:

```hcl
backend "azurerm" {
  resource_group_name  = "rg-terraform-state"
  storage_account_name = "stterraformstate"
  container_name       = "tfstate"
  key                  = "librechat-{environment}.tfstate"
}
```

Create the storage account:

```bash
# Create resource group
az group create --name rg-terraform-state --location "East US"

# Create storage account
az storage account create \
  --name stterraformstate \
  --resource-group rg-terraform-state \
  --sku Standard_LRS \
  --encryption-services blob

# Create container
az storage container create \
  --name tfstate \
  --account-name stterraformstate
```

## Outputs

After deployment, the following outputs are available:

```bash
terraform output container_app_url
terraform output key_vault_uri
terraform output application_insights_instrumentation_key
```

## Updating Deployments

To update container images or configuration:

1. Update the values in the appropriate `environments/*.tfvars` file
2. Create a Pull Request with your changes
3. Review the automatically generated plan in the PR comments
4. After PR approval and merge, trigger the `apply` action via GitHub Actions workflow dispatch

## Security & Compliance

- ✅ All deployments go through CI/CD pipeline
- ✅ Manual approvals required for production changes
- ✅ All secrets stored in Azure Key Vault
- ✅ Managed Identity used for authentication
- ✅ HTTPS enforced (HTTP redirects to HTTPS)
- ✅ Audit trail via GitHub Actions logs
- ✅ Purge protection enabled on Key Vault

## Destroying Infrastructure

⚠️ **Warning**: This will delete all resources!

Destruction can only be performed via the GitHub Actions workflow:

1. Go to Actions → Terraform Infrastructure
2. Click "Run workflow"
3. Select environment and choose `destroy` action
4. Requires approval from the `<environment>-destroy` environment reviewers

## Troubleshooting

### Common Issues

1. **Key Vault Access Denied**: Ensure the Container App's managed identity has access to the Key Vault secrets.

2. **Container App Fails to Start**: Check logs in Log Analytics:
   ```bash
   az containerapp logs show -n <app-name> -g <resource-group>
   ```

3. **Custom Domain Not Working**: Verify DNS is configured and certificate is bound:
   ```bash
   az containerapp hostname list -n <app-name> -g <resource-group>
   ```

### Getting Help

- Check Azure Container Apps documentation
- Review Application Insights for errors
- Examine Log Analytics logs

## Migration from Manual Deployment

If migrating from the existing Azure CLI-based deployment:

1. Import existing resources (optional):
   ```bash
   terraform import module.container_app.azurerm_container_app.this <resource-id>
   ```

2. Or deploy fresh and migrate data:
   - Export data from existing MongoDB
   - Update DNS to point to new deployment
   - Import data to new environment

## Security Considerations

- All secrets are stored in Azure Key Vault
- Managed Identity is used for authentication
- HTTPS is enforced (HTTP redirects to HTTPS)
- Network restrictions can be configured
- Purge protection is enabled on Key Vault in production

## License

See LICENSE file in root directory.

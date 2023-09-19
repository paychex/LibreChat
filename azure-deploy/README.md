# Librechat Deployment Script

This Bash script automates the deployment of Librechat to Azure Container App with the required configuration and secrets. It ensures that all prerequisites are met and sets up the necessary resources in Microsoft Azure. 
## Azure Architecture

[](https://github.com/anildwarepo/draw.io-artifacts/blob/main/LibreChat%20on%20Azure.drawio.png)

## Prerequisites

Before running this script, make sure you have the following prerequisites in place:

1. **Azure CLI**: You should have the Azure CLI installed on your local machine. You can install it by following the instructions [here](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli).

2. **Azure Subscription**: You should have an active Azure subscription with the necessary permissions to create and manage Azure resources.

3. **Azure Container App**: Creates and Container App environment in a Azure Virtual Network with subnet /23. Please make sure that the subnet is /23.

4. **Azure Key Vault**: The script creates a new Azure Key Vault without Private Endpoints. Please make sure you have contributor permissions on the Resource Group. If an existing AKV is used, provide the same name in the config file. 

5. **Azure CosmosDB**: Azure Cosmos DB Mongo API is required to connect Librechat to conversations database. Please make sure it is provisioned. 

6. **Docker Image**: This script builds a Docker image and pushes it to the Azure Container Registry. Please make sure you have access to ACR and have logged in using docker login. 

7. **Configuration and Secrets Files**: You need to create two files, `containerapp-config.env` and `secrets.env`, with the required environment variables and secrets. Ensure that these files are present in the same directory as this script.

8. **AAD Grant Consent**: Please make that the App ID that has been provided has Admin Consent grant to the Microsoft Graph User.Read API. 

9. **Network Security**: This script deploys Azure Resources such as Container Apps inside Virtual Network with private IP address. Necessary DNS configuration must be made if custom DNS server is used. 

10. **API Management**: In this repo, API Management is used as an interface to connect to Azure OpenAI endpoint. The APIM endpoint needs to point to AZURE_OPENAI_API_INSTANCE_NAME="[APIM Instance name].azure-api.net/AzureOpenAI/deployments" in the containerapp-config.env. The APIM needs to use Key Authentication mapped to AZUREAPIKEY in secrets.env with key name being "api-key" configured in APIM. Secrets and config are separated in to different files, so that secrets can be configured separately in AKV. 

## Execution with Secrets and Config Files

1. Clone or download this repository to your local machine.

2. Open a terminal and navigate to the directory where the script is located.

3. Make sure you have set up the `containerapp-config.env` and `secrets.env` files with the necessary values for the environment variables and secrets.

4. Execute the script by running the following command:

    ```bash
    bash deploy-container-app.sh
    ```

5. The script will start deploying the Container App, creating or using existing Azure resources, and configuring secrets from the `secrets.env` file.

6. Follow the on-screen prompts to provide values for any missing environment variables.

7. Once the deployment is successful, the script will display the URL where your Container App is deployed.

8. Your Container App is now deployed and ready to use.

Please note that this script assumes that you have already logged in to Azure CLI using `az login` with appropriate permissions to create and manage resources. Ensure that your Azure CLI session is active before running the script.

For more information on how to set up and use the Azure CLI, refer to the [Azure CLI documentation](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli).
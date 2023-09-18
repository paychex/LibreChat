#!/bin/bash

print_status() {
    echo -e "\e[32m$1\e[0m"
}


# Source the .env file to load the variables
print_status "Sourcing config and secrets..."
source containerapp-config.env
source secrets.env

required_vars=(
    "RESOURCE_GROUP"
    "VNET_RG"
    "VNET_NAME"
    "SUBNET_NAME"
    "ENVIRONMENT"
    "LOCATION"
    "FRONTEND_NAME"
    "FRONTEND_IMAGE"
    "ACR_NAME"
    "APP_TITLE"
    "MONGOURI"
    "AZUREAPIKEY"
    "AZURE_OPENAI_API_INSTANCE_NAME"
    "AZURE_OPENAI_API_DEPLOYMENT_NAME"
    "AZURE_OPENAI_API_VERSION"
    "AZURE_OPENAI_API_COMPLETIONS_DEPLOYMENT_NAME"
    "AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME"
    "AZURE_OPENAI_MODELS"
    "OPENID_CLIENT_ID"
    "OPENIDCLIENTSECRET"
    "OPENID_ISSUER"
    "OPENID_SESSION_SECRET"
    "OPENID_SCOPE"
    "OPENID_CALLBACK_URL"
    "CREDS_KEY"
    "ALLOW_SOCIAL_LOGIN"
    "HOST"
    "NODE_ENV"
    "CREDS_IV"
    "JWT_SECRET"
    "JWT_REFRESH_SECRET"
    "SESSION_EXPIRY"
)

# Loop through the required variables and check if they are set
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        read -rp "Please enter the value for $var: " "$var"
    fi
done

print_status "Deploying Container App..."


#build frontend image
print_status "Building frontend image..."
cd ..
docker build -t librechat:1.0 -f Dockerfile .
docker tag librechat:1.0 $FRONTEND_IMAGE
docker push $FRONTEND_IMAGE

cd azure-deploy

#check if resource group exists
print_status "Checking if resource group $RESOURCE_GROUP exists..."
resource_group=$(az group show -n $RESOURCE_GROUP | jq -r '.id')

if [ -z "${resource_group}" ]
then
    print_status "\e[32m\nResource group $RESOURCE_GROUP not found. Creating...\n\e[0m"
    az group create -n $RESOURCE_GROUP -l $LOCATION
fi


print_status "Checking subnet $SUBNET_NAME"

INFRASTRUCTURE_SUBNET=$(az network vnet subnet show  --name $SUBNET_NAME --resource-group $VNET_RG --vnet-name $VNET_NAME | jq -r '.id')

if [ -z "${INFRASTRUCTURE_SUBNET}" ]
then
    print_status "\nSubnet $SUBNET_NAME not found. Exiting...\n"
    exit 1
fi


#check if containerapp environment exists
print_status "Checking if containerapp environment $ENVIRONMENT exists..."
containerapp_environment=$(az containerapp env show -n $ENVIRONMENT -g $RESOURCE_GROUP | jq -r '.id')

if [ -z "${containerapp_environment}" ]
then
    print_status "\e[32m\nContainer App Environment $ENVIRONMENT not found. Creating...\n\e[0m"
    az containerapp env create -n $ENVIRONMENT --location $LOCATION -g $RESOURCE_GROUP   --infrastructure-subnet-resource-id $INFRASTRUCTURE_SUBNET   --internal-only
fi

containerAppDefaultDomain="https://$FRONTEND_NAME.$(az containerapp env show -n $ENVIRONMENT -g $RESOURCE_GROUP | jq -r '.properties.defaultDomain')"



# Define the environment variables as an array
config=(
    "APP_TITLE=$APP_TITLE"
    "AZURE_OPENAI_API_INSTANCE_NAME=$AZURE_OPENAI_API_INSTANCE_NAME"
    "AZURE_OPENAI_API_DEPLOYMENT_NAME=$AZURE_OPENAI_API_DEPLOYMENT_NAME"
    "AZURE_OPENAI_API_VERSION=$AZURE_OPENAI_API_VERSION"
    "AZURE_OPENAI_API_COMPLETIONS_DEPLOYMENT_NAME=$AZURE_OPENAI_API_COMPLETIONS_DEPLOYMENT_NAME"
    "AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME=$AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME"
    "AZURE_OPENAI_MODELS=$AZURE_OPENAI_MODELS"
    "OPENID_CLIENT_ID=$OPENID_CLIENT_ID"
    "OPENID_ISSUER=$OPENID_ISSUER"
    "OPENID_SESSION_SECRET=$OPENID_SESSION_SECRET"
    "OPENID_SCOPE=$OPENID_SCOPE"
    "OPENID_CALLBACK_URL=$OPENID_CALLBACK_URL"
    "CREDS_KEY=$CREDS_KEY"
    "ALLOW_SOCIAL_LOGIN=$ALLOW_SOCIAL_LOGIN"
    "HOST=$HOST"
    "NODE_ENV=$NODE_ENV"
    "CREDS_IV=$CREDS_IV"
    "JWT_SECRET=$JWT_SECRET"
    "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
    "DOMAIN_CLIENT=$containerAppDefaultDomain"
    "DOMAIN_SERVER=$containerAppDefaultDomain"
    "SESSION_EXPIRY=$SESSION_EXPIRY"
)

# Use the "config" array in your command

print_status "Creating Container App..."
az containerapp create   \
--name $FRONTEND_NAME   \
--resource-group $RESOURCE_GROUP   \
--environment $ENVIRONMENT   \
--image $FRONTEND_IMAGE    \
--min-replicas 1 \
--max-replicas 1 \
--target-port 3080   \
--ingress 'external'   \
--registry-server $ACR_NAME.azurecr.io   \
--query properties.configuration.ingress \
--env-vars "${config[@]}" 

#check if identity exists
print_status "Checking if identity $FRONTEND_NAME-identity exists..."
frontend_identity=$(az identity show -g $RESOURCE_GROUP -n $FRONTEND_NAME-identity | jq -r '.id')

if [ -z "${frontend_identity}" ]
then
    print_status "\e[32m\nIdentity $FRONTEND_NAME-identity not found. Creating...\n\e[0m"
    az identity create -g $RESOURCE_GROUP -n $FRONTEND_NAME-identity
fi

#assign managed identity to container app
print_status "Assigning managed identity to container app..."
az containerapp identity assign -n $FRONTEND_NAME -g $RESOURCE_GROUP --user-assigned $FRONTEND_NAME-identity



#check if key vault exists
print_status "Checking if key vault $FRONTEND_NAME-keyvault exists..."
frontend_keyvault=$(az keyvault show -g $RESOURCE_GROUP -n $FRONTEND_NAME-keyvault | jq -r '.id')

if [ -z "${frontend_keyvault}" ]
then
    print_status "\e[32m\nKey vault $FRONTEND_NAME-keyvault not found. Creating...\n\e[0m"
    az keyvault create -g $RESOURCE_GROUP -n $FRONTEND_NAME-keyvault
fi
#assign managed identity to key vault access policy read secrets
frontend_principal_id=$(az identity show -g $RESOURCE_GROUP -n $FRONTEND_NAME-identity | jq -r '.principalId')
az keyvault set-policy -n $FRONTEND_NAME-keyvault -g $RESOURCE_GROUP --secret-permissions get --object-id $frontend_principal_id


# add secrets to key vault
print_status "Adding secrets to key vault..."
# Path to the file containing secrets
secrets_file="secrets.env"
# Open the file for reading
exec 3<"secrets.env"

while read -u 3 line; do
    IFS='=' read -r key value <<< "$line"
    echo "Key: $key"
    az keyvault secret set --vault-name $FRONTEND_NAME-keyvault -n $key --value ${value//\"/}
done


#update container app with key vault secret references
print_status "Updating container app with key vault secret references..."
az containerapp secret set -n $FRONTEND_NAME -g $RESOURCE_GROUP  \
--secrets mongouri=keyvaultref:https://$FRONTEND_NAME-keyvault.vault.azure.net/secrets/mongouri,identityref:$frontend_identity \
azureapikey=keyvaultref:https://$FRONTEND_NAME-keyvault.vault.azure.net/secrets/azureapikey,identityref:$frontend_identity  \
openidclientsecret=keyvaultref:https://$FRONTEND_NAME-keyvault.vault.azure.net/secrets/openidclientsecret,identityref:$frontend_identity 

#update container app with key vault secret references
print_status "Updating container app with secrets..."
az containerapp update --name $FRONTEND_NAME --resource-group $RESOURCE_GROUP --min-replicas 1 --max-replicas 1 \
--set-env-vars \
"MONGO_URI=secretref:mongouri" \
"AZURE_API_KEY=secretref:azureapikey" \
"OPENID_CLIENT_SECRET=secretref:openidclientsecret" 




# Add redirect Urls

print_status "Adding redirect Urls to Azure Active Directory..."
objectId=$(az ad app show --id $OPENID_CLIENT_ID | jq -r .id)
#redirecttype=spa | web | publicClient
redirecttype=web
redirecturl="$containerAppDefaultDomain/oauth/openid/callback"
graphurl=https://graph.microsoft.com/v1.0/applications/$objectId
az rest --method PATCH --uri $graphurl --headers 'Content-Type=application/json' --body '{"'$redirecttype'":{"redirectUris":["'$redirecturl'"]}}' 



echo "Done! Librechat is deployed to $containerAppDefaultDomain"



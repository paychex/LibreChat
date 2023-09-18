const genAzureEndpoint = ({ azureOpenAIApiInstanceName, azureOpenAIApiDeploymentName }) => {
  return `https://${azureOpenAIApiInstanceName}/${azureOpenAIApiDeploymentName}`;
};

const genAzureChatCompletion = ({
  azureOpenAIApiInstanceName,
  azureOpenAIApiDeploymentName,
  azureOpenAIApiVersion,
}) => {
  return `https://${azureOpenAIApiInstanceName}/${azureOpenAIApiDeploymentName}/chat/completions?api-version=${azureOpenAIApiVersion}`;
};

const getAzureCredentials = () => {
  return {
    azureOpenAIApiKey: process.env.AZURE_API_KEY ?? process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
  };
};

module.exports = { genAzureEndpoint, genAzureChatCompletion, getAzureCredentials };

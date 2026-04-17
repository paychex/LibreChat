const { Providers } = require('@librechat/agents');
const { EModelEndpoint } = require('librechat-data-provider');
const {
  getCustomEndpointConfig,
  initializeAnthropic,
  initializeBedrock,
  initializeCustom,
  initializeGoogle,
  initializeOpenAI,
} = require('@librechat/api');

/** Check if the provider is a known custom provider
 * @param {string | undefined} [provider] - The provider string
 * @returns {boolean} - True if the provider is a known custom provider, false otherwise
 */
function isKnownCustomProvider(provider) {
  return [Providers.XAI, Providers.DEEPSEEK, Providers.OPENROUTER, Providers.MOONSHOT].includes(
    provider?.toLowerCase() || '',
  );
}

const providerConfigMap = {
  [Providers.XAI]: initializeCustom,
  [Providers.DEEPSEEK]: initializeCustom,
  [Providers.MOONSHOT]: initializeCustom,
  [Providers.OPENROUTER]: initializeCustom,
  [EModelEndpoint.openAI]: initializeOpenAI,
  [EModelEndpoint.google]: initializeGoogle,
  [EModelEndpoint.azureOpenAI]: initializeOpenAI,
  [EModelEndpoint.anthropic]: initializeAnthropic,
  [EModelEndpoint.bedrock]: initializeBedrock,
};

/**
 * Get the provider configuration and override endpoint based on the provider string
 * @param {Object} params
 * @param {string} params.provider - The provider string
 * @param {AppConfig} params.appConfig - The application configuration
 * @returns {{
 * getOptions: (typeof providerConfigMap)[keyof typeof providerConfigMap],
 * overrideProvider: string,
 * customEndpointConfig?: TEndpoint
 * }}
 */
function getProviderConfig({ provider, appConfig }) {
  let getOptions = providerConfigMap[provider];
  let overrideProvider = provider;
  /** @type {TEndpoint | undefined} */
  let customEndpointConfig;

  if (!getOptions && providerConfigMap[provider.toLowerCase()] != null) {
    overrideProvider = provider.toLowerCase();
    getOptions = providerConfigMap[overrideProvider];
  } else if (!getOptions) {
    customEndpointConfig = getCustomEndpointConfig({ endpoint: provider, appConfig });
    if (!customEndpointConfig) {
      throw new Error(`Provider ${provider} not supported`);
    }
    getOptions = initializeCustom;
    overrideProvider = Providers.OPENAI;
  }

  if (isKnownCustomProvider(overrideProvider) && !customEndpointConfig) {
    customEndpointConfig = getCustomEndpointConfig({ endpoint: provider, appConfig });
    if (!customEndpointConfig) {
      throw new Error(`Provider ${provider} not supported`);
    }
  }

  return {
    getOptions,
    overrideProvider,
    customEndpointConfig,
  };
}

module.exports = {
  getProviderConfig,
};

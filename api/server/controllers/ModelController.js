const { logger } = require('@librechat/data-schemas');
const { CacheKeys } = require('librechat-data-provider');
const { loadDefaultModels, loadConfigModels } = require('~/server/services/Config');
const { getLogStores } = require('~/cache');

/**
 * @param {ServerRequest} req
 * @returns {Promise<TModelsConfig>} The models config.
 */
const getModelsConfig = async (req) => {
  const cache = getLogStores(CacheKeys.CONFIG_STORE);
  let modelsConfig = await cache.get(CacheKeys.MODELS_CONFIG);
  if (!modelsConfig) {
    modelsConfig = await loadModels(req);
  }

  return modelsConfig;
};

/**
 * Loads the models from the config.
 * @param {ServerRequest} req - The Express request object.
 * @returns {Promise<TModelsConfig>} The models config.
 */
async function loadModels(req) {
  const cache = getLogStores(CacheKeys.CONFIG_STORE);
  const cachedModelsConfig = await cache.get(CacheKeys.MODELS_CONFIG);
  if (cachedModelsConfig) {
    return cachedModelsConfig;
  }
  const defaultModelsConfig = await loadDefaultModels(req);
  const customModelsConfig = await loadConfigModels(req);

  const modelConfig = { ...defaultModelsConfig, ...customModelsConfig };

  await cache.set(CacheKeys.MODELS_CONFIG, modelConfig);
  return modelConfig;
}

async function modelController(req, res) {
  try {
    const modelConfig = await loadModels(req);
    res.send(modelConfig);
  } catch (error) {
    logger.error('Error fetching models:', error);
    res.status(500).send({ error: error.message });
  }
}

/**
 * Refreshes the models cache by clearing MODELS_CONFIG from CONFIG_STORE
 * and clearing the MODEL_QUERIES cache.
 * @param {ServerRequest} req - The Express request object.
 * @param {ServerResponse} res - The Express response object.
 */
async function refreshModelsCache(req, res) {
  try {
    const configCache = getLogStores(CacheKeys.CONFIG_STORE);
    const modelQueriesCache = getLogStores(CacheKeys.MODEL_QUERIES);

    await configCache.delete(CacheKeys.MODELS_CONFIG);
    await modelQueriesCache.clear();

    logger.info('[refreshModelsCache] Models cache cleared successfully');
    res.status(200).json({ message: 'Models cache refreshed successfully' });
  } catch (error) {
    logger.error('[refreshModelsCache] Error refreshing models cache:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = { modelController, loadModels, getModelsConfig, refreshModelsCache };

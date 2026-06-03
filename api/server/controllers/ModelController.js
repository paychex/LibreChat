const { logger } = require('@librechat/data-schemas');
const { loadDefaultModels, loadConfigModels } = require('~/server/services/Config');

const getModelsConfig = (req) => loadModels(req);

async function loadModels(req) {
  const defaultModelsConfig = await loadDefaultModels(req);
  const customModelsConfig = await loadConfigModels(req);
  return { ...defaultModelsConfig, ...customModelsConfig };
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

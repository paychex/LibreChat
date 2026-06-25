const express = require('express');
const {
  createPromptHubResolveInsertHandler,
  createPromptHubCatalogListHandler,
} = require('@librechat/api');
const { requireJwtAuth } = require('~/server/middleware');

const router = express.Router();

const promptHubResolveInsertHandler = createPromptHubResolveInsertHandler({
  getPromptCatalogApiUrl: () => process.env.PROMPT_CATALOG_API_URL,
});

const promptHubCatalogListHandler = createPromptHubCatalogListHandler({
  getPromptCatalogApiUrl: () => process.env.PROMPT_CATALOG_API_URL,
});

router.post('/resolve-insert', requireJwtAuth, promptHubResolveInsertHandler);
router.get('/catalog', requireJwtAuth, promptHubCatalogListHandler);

module.exports = router;

const express = require('express');
const {
  createPromptHubResolveInsertHandler,
  createPromptHubCatalogListHandler,
  createPromptHubCatalogCategoriesHandler,
  createPromptHubCatalogTagsHandler,
  createPromptHubCatalogCreateHandler,
  createPromptHubCatalogUpdateHandler,
  createPromptHubCatalogDeleteHandler,
} = require('@librechat/api');
const { requireJwtAuth } = require('~/server/middleware');

const router = express.Router();

const promptHubResolveInsertHandler = createPromptHubResolveInsertHandler({
  getPromptCatalogApiUrl: () => process.env.PROMPT_CATALOG_API_URL,
});

const promptHubCatalogListHandler = createPromptHubCatalogListHandler({
  getPromptCatalogApiUrl: () => process.env.PROMPT_CATALOG_API_URL,
});

const promptHubCatalogCategoriesHandler = createPromptHubCatalogCategoriesHandler({
  getPromptCatalogApiUrl: () => process.env.PROMPT_CATALOG_API_URL,
});

const promptHubCatalogTagsHandler = createPromptHubCatalogTagsHandler({
  getPromptCatalogApiUrl: () => process.env.PROMPT_CATALOG_API_URL,
});

const promptHubCatalogCreateHandler = createPromptHubCatalogCreateHandler({
  getPromptCatalogApiUrl: () => process.env.PROMPT_CATALOG_API_URL,
});

const promptHubCatalogUpdateHandler = createPromptHubCatalogUpdateHandler({
  getPromptCatalogApiUrl: () => process.env.PROMPT_CATALOG_API_URL,
});

const promptHubCatalogDeleteHandler = createPromptHubCatalogDeleteHandler({
  getPromptCatalogApiUrl: () => process.env.PROMPT_CATALOG_API_URL,
});

router.post('/resolve-insert', requireJwtAuth, promptHubResolveInsertHandler);
router.get('/catalog', requireJwtAuth, promptHubCatalogListHandler);
router.get('/catalog/categories', requireJwtAuth, promptHubCatalogCategoriesHandler);
router.get('/catalog/tags', requireJwtAuth, promptHubCatalogTagsHandler);
router.post('/catalog', requireJwtAuth, promptHubCatalogCreateHandler);
router.put('/catalog/:id', requireJwtAuth, promptHubCatalogUpdateHandler);
router.delete('/catalog/:id', requireJwtAuth, promptHubCatalogDeleteHandler);

module.exports = router;

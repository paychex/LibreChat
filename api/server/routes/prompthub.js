const express = require('express');
const { createPromptHubResolveInsertHandler } = require('@librechat/api');
const { requireJwtAuth } = require('~/server/middleware');

const router = express.Router();

const promptHubResolveInsertHandler = createPromptHubResolveInsertHandler({
  getPromptCatalogApiUrl: () => process.env.PROMPT_CATALOG_API_URL,
});

router.post('/resolve-insert', requireJwtAuth, promptHubResolveInsertHandler);

module.exports = router;

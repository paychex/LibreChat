const axios = require('axios');
const express = require('express');
const { logger } = require('@librechat/data-schemas');
const { requireJwtAuth } = require('~/server/middleware');

const router = express.Router();

const PROMPT_CATALOG_API_URL =
  process.env.PROMPT_CATALOG_API_URL ||
  'https://app-promptcatalog-api-eastus-prod-001.azurewebsites.net/api';
const PROMPT_CATALOG_WEB_URL =
  process.env.PROMPT_CATALOG_WEB_URL ||
  'https://app-aidocs-web-eastus-prod-002.azurewebsites.net/prompts';
const PROMPT_CATALOG_SOURCE = 'promptCatalog';
const DEFAULT_PAGE_SIZE = 200;

const getCatalogApiUrl = () => PROMPT_CATALOG_API_URL.replace(/\/$/, '');

const getUserName = (user) => user?.name || user?.username || user?.email || '';

const getRequestHeaders = (user) => {
  const headers = {};
  if (user?.email) {
    headers['x-forwarded-user-email'] = user.email;
  }
  const userName = getUserName(user);
  if (userName) {
    headers['x-forwarded-user-name'] = userName;
  }
  return headers;
};

const getSnippet = (prompt) => {
  if (typeof prompt.impact === 'string' && prompt.impact.trim()) {
    return prompt.impact;
  }
  if (typeof prompt.content !== 'string') {
    return '';
  }
  return prompt.content.length > 240 ? `${prompt.content.slice(0, 237)}...` : prompt.content;
};

const toPromptGroup = (prompt) => {
  const promptId = String(prompt.id);
  const groupId = `${PROMPT_CATALOG_SOURCE}:${promptId}`;

  return {
    _id: groupId,
    name: prompt.title || `Prompt ${promptId}`,
    oneliner: getSnippet(prompt),
    category: prompt.category || '',
    productionId: groupId,
    productionPrompt: {
      prompt: prompt.content || '',
    },
    author: prompt.creator_email || '',
    authorName: prompt.creator_name || prompt.creator_email || '',
    createdAt: prompt.created_at,
    updatedAt: prompt.updated_at,
    promptSource: PROMPT_CATALOG_SOURCE,
    externalId: promptId,
    editUrl: PROMPT_CATALOG_WEB_URL,
    aiTool: prompt.ai_tool,
    tags: prompt.tags || [],
    thumbsUpCount: prompt.thumbs_up_count || 0,
    favoriteCount: prompt.favorite_count || 0,
    leadershipApproved: prompt.leadership_approved || false,
  };
};

router.use(requireJwtAuth);

router.get('/groups', async (req, res) => {
  const { name, search, category, page = 1, pageSize = DEFAULT_PAGE_SIZE } = req.query;
  const searchTerm = search || name;
  const size = Math.min(Number(pageSize) || DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE);

  const params = {
    page,
    pageSize: size,
    sortBy: 'thumbs_up_count',
    sortOrder: 'desc',
  };

  if (searchTerm) {
    params.search = searchTerm;
  }
  if (category) {
    params.category = category;
  }
  if (req.user?.email) {
    params.userEmail = req.user.email;
  }

  try {
    const response = await axios.get(`${getCatalogApiUrl()}/prompts`, {
      params,
      headers: getRequestHeaders(req.user),
      timeout: 10000,
    });
    const prompts = Array.isArray(response.data?.prompts) ? response.data.prompts : [];
    res.status(200).send(prompts.map(toPromptGroup));
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.error || error.message;
    logger.error('[promptCatalog] Error fetching prompt catalog groups', {
      status,
      message,
    });
    res.status(502).send({ error: 'Error fetching prompt catalog groups' });
  }
});

module.exports = router;

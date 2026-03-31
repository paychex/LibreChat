const express = require('express');
const { modelController, refreshModelsCache } = require('~/server/controllers/ModelController');
const { requireJwtAuth, checkAdmin } = require('~/server/middleware/');

const router = express.Router();
router.get('/', requireJwtAuth, modelController);
router.post('/refresh', requireJwtAuth, checkAdmin, refreshModelsCache);

module.exports = router;

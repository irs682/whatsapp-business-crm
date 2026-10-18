const { Router } = require('express');
const campaignController = require('./campaign.controller');
const authenticate = require('../../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => campaignController.list(req, res, next));

module.exports = router;

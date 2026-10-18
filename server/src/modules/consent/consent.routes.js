const { Router } = require('express');
const consentController = require('./consent.controller');
const authenticate = require('../../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => consentController.list(req, res, next));

module.exports = router;

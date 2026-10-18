const { Router } = require('express');
const auditController = require('./audit.controller');
const authenticate = require('../../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => auditController.list(req, res, next));

module.exports = router;

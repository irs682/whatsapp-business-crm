const { Router } = require('express');
const reportController = require('./report.controller');
const authenticate = require('../../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => reportController.list(req, res, next));

module.exports = router;

const { Router } = require('express');
const templateController = require('./template.controller');
const authenticate = require('../../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => templateController.list(req, res, next));

module.exports = router;

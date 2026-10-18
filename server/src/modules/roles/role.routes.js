const { Router } = require('express');
const roleController = require('./role.controller');
const authenticate = require('../../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => roleController.list(req, res, next));

module.exports = router;

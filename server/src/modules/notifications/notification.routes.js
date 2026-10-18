const { Router } = require('express');
const notificationController = require('./notification.controller');
const authenticate = require('../../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => notificationController.list(req, res, next));

module.exports = router;

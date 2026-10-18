const { Router } = require('express');
const messageController = require('./message.controller');
const authenticate = require('../../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => messageController.list(req, res, next));

module.exports = router;

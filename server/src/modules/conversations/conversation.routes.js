const { Router } = require('express');
const conversationController = require('./conversation.controller');
const authenticate = require('../../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => conversationController.list(req, res, next));

module.exports = router;

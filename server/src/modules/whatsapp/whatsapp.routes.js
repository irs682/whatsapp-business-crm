const { Router } = require('express');
const whatsappController = require('./whatsapp.controller');
const authenticate = require('../../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => whatsappController.list(req, res, next));

module.exports = router;

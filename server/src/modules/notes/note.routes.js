const { Router } = require('express');
const noteController = require('./note.controller');
const authenticate = require('../../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => noteController.list(req, res, next));

module.exports = router;

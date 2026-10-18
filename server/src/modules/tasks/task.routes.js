const { Router } = require('express');
const taskController = require('./task.controller');
const authenticate = require('../../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => taskController.list(req, res, next));

module.exports = router;

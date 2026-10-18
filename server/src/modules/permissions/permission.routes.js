const { Router } = require('express');
const permissionController = require('./permission.controller');
const authenticate = require('../../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => permissionController.list(req, res, next));

module.exports = router;

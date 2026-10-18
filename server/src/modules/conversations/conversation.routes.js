const { Router } = require('express');
const conversationController = require('./conversation.controller');
const authenticate = require('../../middleware/auth.middleware');

const { requirePermissions } = require('../../middleware/rbac.middleware');
const PERMISSIONS = require('../../constants/permissions');

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermissions(PERMISSIONS.CONVERSATIONS_READ),
  (req, res, next) => conversationController.list(req, res, next)
);

router.get(
  '/:id',
  requirePermissions(PERMISSIONS.CONVERSATIONS_READ),
  (req, res, next) => conversationController.getById(req, res, next)
);

module.exports = router;

const { Router } = require('express');
const messageController = require('./message.controller');
const { sendMessageSchema, listMessagesQuerySchema } = require('./message.validation');
const validate = require('../../middleware/validate.middleware');
const authenticate = require('../../middleware/auth.middleware');
const { requirePermissions } = require('../../middleware/rbac.middleware');
const PERMISSIONS = require('../../constants/permissions');

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get(
  '/',
  requirePermissions(PERMISSIONS.CONVERSATIONS_READ),
  validate(listMessagesQuerySchema, 'query'),
  (req, res, next) => messageController.list(req, res, next)
);

router.post(
  '/',
  requirePermissions(PERMISSIONS.CONVERSATIONS_REPLY),
  validate(sendMessageSchema),
  (req, res, next) => messageController.create(req, res, next)
);

module.exports = router;

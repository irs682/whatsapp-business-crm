const { Router } = require('express');
const quickReplyController = require('./quickReply.controller');
const {
  createQuickReplySchema,
  updateQuickReplySchema,
  listQuickRepliesQuerySchema,
} = require('./quickReply.validation');
const validate = require('../../middleware/validate.middleware');
const authenticate = require('../../middleware/auth.middleware');
const { requirePermissions } = require('../../middleware/rbac.middleware');
const PERMISSIONS = require('../../constants/permissions');

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermissions(PERMISSIONS.QUICK_REPLIES_READ),
  validate(listQuickRepliesQuerySchema, 'query'),
  (req, res, next) => quickReplyController.list(req, res, next)
);

router.get(
  '/:id',
  requirePermissions(PERMISSIONS.QUICK_REPLIES_READ),
  (req, res, next) => quickReplyController.getById(req, res, next)
);

router.post(
  '/',
  requirePermissions(PERMISSIONS.QUICK_REPLIES_MANAGE),
  validate(createQuickReplySchema),
  (req, res, next) => quickReplyController.create(req, res, next)
);

router.patch(
  '/:id',
  requirePermissions(PERMISSIONS.QUICK_REPLIES_MANAGE),
  validate(updateQuickReplySchema),
  (req, res, next) => quickReplyController.update(req, res, next)
);

router.delete(
  '/:id',
  requirePermissions(PERMISSIONS.QUICK_REPLIES_MANAGE),
  (req, res, next) => quickReplyController.delete(req, res, next)
);

module.exports = router;

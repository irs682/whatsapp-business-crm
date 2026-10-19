const { Router } = require('express');
const conversationController = require('./conversation.controller');
const {
  createConversationSchema,
  updateStatusSchema,
  updatePrioritySchema,
  assignConversationSchema,
  transferConversationSchema,
  listConversationsQuerySchema,
} = require('./conversation.validation');
const validate = require('../../middleware/validate.middleware');
const authenticate = require('../../middleware/auth.middleware');
const { requirePermissions } = require('../../middleware/rbac.middleware');
const PERMISSIONS = require('../../constants/permissions');
const messageRoutes = require('../messages/message.routes');
const noteRoutes = require('../notes/note.routes');

const router = Router();

router.use(authenticate);

// Mount nested sub-routers for conversation messages & notes
router.use('/:conversationId/messages', messageRoutes);
router.use('/:conversationId/notes', noteRoutes);

router.get(
  '/',
  requirePermissions(PERMISSIONS.CONVERSATIONS_READ),
  validate(listConversationsQuerySchema, 'query'),
  (req, res, next) => conversationController.list(req, res, next)
);

router.post(
  '/',
  requirePermissions(PERMISSIONS.CONVERSATIONS_REPLY),
  validate(createConversationSchema),
  (req, res, next) => conversationController.create(req, res, next)
);

router.get(
  '/:id',
  requirePermissions(PERMISSIONS.CONVERSATIONS_READ),
  (req, res, next) => conversationController.getById(req, res, next)
);

router.patch(
  '/:id/status',
  requirePermissions(PERMISSIONS.CONVERSATIONS_CLOSE),
  validate(updateStatusSchema),
  (req, res, next) => conversationController.updateStatus(req, res, next)
);

router.patch(
  '/:id/priority',
  requirePermissions(PERMISSIONS.CONVERSATIONS_REPLY),
  validate(updatePrioritySchema),
  (req, res, next) => conversationController.updatePriority(req, res, next)
);

router.post(
  '/:id/claim',
  requirePermissions(PERMISSIONS.CONVERSATIONS_ASSIGN),
  (req, res, next) => conversationController.claim(req, res, next)
);

router.post(
  '/:id/assign',
  requirePermissions(PERMISSIONS.CONVERSATIONS_ASSIGN),
  validate(assignConversationSchema),
  (req, res, next) => conversationController.assign(req, res, next)
);

router.post(
  '/:id/transfer',
  requirePermissions(PERMISSIONS.CONVERSATIONS_TRANSFER),
  validate(transferConversationSchema),
  (req, res, next) => conversationController.transfer(req, res, next)
);

router.post(
  '/:id/read',
  requirePermissions(PERMISSIONS.CONVERSATIONS_READ),
  (req, res, next) => conversationController.markAsRead(req, res, next)
);

router.post(
  '/:id/send-text',
  requirePermissions(PERMISSIONS.CONVERSATIONS_REPLY),
  (req, res, next) => conversationController.sendText(req, res, next)
);

router.post(
  '/:id/send-template',
  requirePermissions(PERMISSIONS.CONVERSATIONS_REPLY),
  (req, res, next) => conversationController.sendTemplate(req, res, next)
);

module.exports = router;

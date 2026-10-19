const { Router } = require('express');
const segmentController = require('./segment.controller');
const authenticate = require('../../../middleware/auth.middleware');
const { requirePermissions, requireAnyPermission } = require('../../../middleware/rbac.middleware');
const PERMISSIONS = require('../../../constants/permissions');

const router = Router();

router.use(authenticate);

// List segments
router.get(
  '/',
  requireAnyPermission(PERMISSIONS.SEGMENTS_READ, PERMISSIONS.CAMPAIGNS_READ),
  (req, res, next) => segmentController.list(req, res, next)
);

// Preview audience filters ad-hoc
router.post(
  '/preview',
  requireAnyPermission(PERMISSIONS.SEGMENTS_READ, PERMISSIONS.CAMPAIGNS_CREATE),
  (req, res, next) => segmentController.preview(req, res, next)
);

// Create new saved segment
router.post(
  '/',
  requireAnyPermission(PERMISSIONS.SEGMENTS_MANAGE, PERMISSIONS.CAMPAIGNS_CREATE),
  (req, res, next) => segmentController.create(req, res, next)
);

// Get single saved segment
router.get(
  '/:id',
  requireAnyPermission(PERMISSIONS.SEGMENTS_READ, PERMISSIONS.CAMPAIGNS_READ),
  (req, res, next) => segmentController.getById(req, res, next)
);

// Preview contacts for a saved segment
router.post(
  '/:id/preview',
  requireAnyPermission(PERMISSIONS.SEGMENTS_READ, PERMISSIONS.CAMPAIGNS_READ),
  (req, res, next) => segmentController.previewSaved(req, res, next)
);

// Update saved segment
router.patch(
  '/:id',
  requirePermissions(PERMISSIONS.SEGMENTS_MANAGE),
  (req, res, next) => segmentController.update(req, res, next)
);

// Archive saved segment
router.delete(
  '/:id',
  requirePermissions(PERMISSIONS.SEGMENTS_MANAGE),
  (req, res, next) => segmentController.delete(req, res, next)
);

module.exports = router;

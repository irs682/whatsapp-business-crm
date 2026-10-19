const { Router } = require('express');
const campaignController = require('./campaign.controller');
const authenticate = require('../../middleware/auth.middleware');
const { requirePermissions, requireAnyPermission } = require('../../middleware/rbac.middleware');
const PERMISSIONS = require('../../constants/permissions');

const router = Router();

router.use(authenticate);

// List campaigns
router.get(
  '/',
  requirePermissions(PERMISSIONS.CAMPAIGNS_READ),
  (req, res, next) => campaignController.list(req, res, next)
);

// Create campaign
router.post(
  '/',
  requirePermissions(PERMISSIONS.CAMPAIGNS_CREATE),
  (req, res, next) => campaignController.create(req, res, next)
);

// Get single campaign
router.get(
  '/:id',
  requirePermissions(PERMISSIONS.CAMPAIGNS_READ),
  (req, res, next) => campaignController.getById(req, res, next)
);

// Update campaign
router.patch(
  '/:id',
  requirePermissions(PERMISSIONS.CAMPAIGNS_UPDATE),
  (req, res, next) => campaignController.update(req, res, next)
);

// Submit for review
router.post(
  '/:id/submit-approval',
  requireAnyPermission(PERMISSIONS.CAMPAIGNS_CREATE, PERMISSIONS.CAMPAIGNS_UPDATE),
  (req, res, next) => campaignController.submitApproval(req, res, next)
);

// Approve campaign
router.post(
  '/:id/approve',
  requirePermissions(PERMISSIONS.CAMPAIGNS_APPROVE),
  (req, res, next) => campaignController.approve(req, res, next)
);

// Reject campaign
router.post(
  '/:id/reject',
  requirePermissions(PERMISSIONS.CAMPAIGNS_APPROVE),
  (req, res, next) => campaignController.reject(req, res, next)
);

// Schedule campaign
router.post(
  '/:id/schedule',
  requirePermissions(PERMISSIONS.CAMPAIGNS_SCHEDULE),
  (req, res, next) => campaignController.schedule(req, res, next)
);

// Launch campaign
router.post(
  '/:id/start',
  requirePermissions(PERMISSIONS.CAMPAIGNS_START),
  (req, res, next) => campaignController.start(req, res, next)
);

// Pause campaign
router.post(
  '/:id/pause',
  requirePermissions(PERMISSIONS.CAMPAIGNS_CANCEL),
  (req, res, next) => campaignController.pause(req, res, next)
);

// Resume campaign
router.post(
  '/:id/resume',
  requirePermissions(PERMISSIONS.CAMPAIGNS_START),
  (req, res, next) => campaignController.resume(req, res, next)
);

// Cancel campaign
router.post(
  '/:id/cancel',
  requirePermissions(PERMISSIONS.CAMPAIGNS_CANCEL),
  (req, res, next) => campaignController.cancel(req, res, next)
);

// Preview campaign personalization & audience
router.post(
  '/:id/preview',
  requirePermissions(PERMISSIONS.CAMPAIGNS_READ),
  (req, res, next) => campaignController.preview(req, res, next)
);

// Get campaign recipients
router.get(
  '/:id/recipients',
  requirePermissions(PERMISSIONS.CAMPAIGNS_READ),
  (req, res, next) => campaignController.getRecipients(req, res, next)
);

// Get campaign performance results
router.get(
  '/:id/results',
  requirePermissions(PERMISSIONS.CAMPAIGNS_READ),
  (req, res, next) => campaignController.getResults(req, res, next)
);

// Get campaign activity history
router.get(
  '/:id/activity',
  requirePermissions(PERMISSIONS.CAMPAIGNS_READ),
  (req, res, next) => campaignController.getActivity(req, res, next)
);

module.exports = router;

const { Router } = require('express');
const consentController = require('./consent.controller');
const authenticate = require('../../middleware/auth.middleware');
const { requirePermissions, requireAnyPermission } = require('../../middleware/rbac.middleware');
const PERMISSIONS = require('../../constants/permissions');

const router = Router();

router.use(authenticate);

// Global list of consent events
router.get(
  '/',
  requireAnyPermission(PERMISSIONS.MARKETING_CONSENT_READ, PERMISSIONS.CONTACTS_READ),
  (req, res, next) => consentController.list(req, res, next)
);

// Specific contact marketing consent endpoints
router.get(
  '/contacts/:id',
  requireAnyPermission(PERMISSIONS.MARKETING_CONSENT_READ, PERMISSIONS.CONTACTS_READ),
  (req, res, next) => consentController.getContactConsent(req, res, next)
);

router.post(
  '/contacts/:id',
  requireAnyPermission(PERMISSIONS.MARKETING_CONSENT_MANAGE, PERMISSIONS.CONTACTS_UPDATE),
  (req, res, next) => consentController.recordContactConsent(req, res, next)
);

router.get(
  '/contacts/:id/history',
  requireAnyPermission(PERMISSIONS.MARKETING_CONSENT_READ, PERMISSIONS.CONTACTS_READ),
  (req, res, next) => consentController.getContactConsentHistory(req, res, next)
);

module.exports = router;

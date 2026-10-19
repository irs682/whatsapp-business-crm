const { Router } = require('express');
const automationController = require('./automation.controller');
const authenticate = require('../../../middleware/auth.middleware');
const { requirePermissions, requireAnyPermission } = require('../../../middleware/rbac.middleware');
const PERMISSIONS = require('../../../constants/permissions');

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requireAnyPermission(PERMISSIONS.AUTOMATIONS_READ, PERMISSIONS.CAMPAIGNS_READ),
  (req, res, next) => automationController.list(req, res, next)
);

router.post(
  '/',
  requirePermissions(PERMISSIONS.AUTOMATIONS_MANAGE),
  (req, res, next) => automationController.create(req, res, next)
);

router.get(
  '/:id',
  requirePermissions(PERMISSIONS.AUTOMATIONS_READ),
  (req, res, next) => automationController.getById(req, res, next)
);

router.patch(
  '/:id',
  requirePermissions(PERMISSIONS.AUTOMATIONS_MANAGE),
  (req, res, next) => automationController.update(req, res, next)
);

router.delete(
  '/:id',
  requirePermissions(PERMISSIONS.AUTOMATIONS_MANAGE),
  (req, res, next) => automationController.delete(req, res, next)
);

router.get(
  '/:id/executions',
  requirePermissions(PERMISSIONS.AUTOMATIONS_READ),
  (req, res, next) => automationController.getExecutions(req, res, next)
);

module.exports = router;

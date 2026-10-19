const { Router } = require('express');
const dashboardController = require('./dashboard.controller');
const authenticate = require('../../middleware/auth.middleware');
const { requirePermissions } = require('../../middleware/rbac.middleware');
const PERMISSIONS = require('../../constants/permissions');

const router = Router();

router.use(authenticate);

router.get(
  '/metrics',
  requirePermissions(PERMISSIONS.DASHBOARD_READ),
  (req, res, next) => dashboardController.getMetrics(req, res, next)
);

module.exports = router;

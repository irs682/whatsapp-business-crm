const { Router } = require('express');
const auditController = require('./audit.controller');
const authenticate = require('../../middleware/auth.middleware');
const { requirePermissions } = require('../../middleware/rbac.middleware');
const PERMISSIONS = require('../../constants/permissions');

const router = Router();

router.use(authenticate);
router.use(requirePermissions(PERMISSIONS.AUDIT_READ));

router.get('/export', (req, res, next) => auditController.export(req, res, next));
router.get('/:id', (req, res, next) => auditController.getById(req, res, next));
router.get('/', (req, res, next) => auditController.list(req, res, next));

module.exports = router;

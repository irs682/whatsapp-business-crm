const { Router } = require('express');
const leadController = require('./lead.controller');
const {
  createLeadSchema,
  updateLeadSchema,
  listLeadQuerySchema,
} = require('./lead.validation');
const validate = require('../../middleware/validate.middleware');
const authenticate = require('../../middleware/auth.middleware');
const { requirePermissions } = require('../../middleware/rbac.middleware');
const PERMISSIONS = require('../../constants/permissions');

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermissions(PERMISSIONS.LEADS_READ),
  validate(listLeadQuerySchema, 'query'),
  (req, res, next) => leadController.list(req, res, next)
);

router.get(
  '/:id',
  requirePermissions(PERMISSIONS.LEADS_READ),
  (req, res, next) => leadController.getById(req, res, next)
);

router.post(
  '/',
  requirePermissions(PERMISSIONS.LEADS_CREATE),
  validate(createLeadSchema),
  (req, res, next) => leadController.create(req, res, next)
);

router.patch(
  '/:id',
  requirePermissions(PERMISSIONS.LEADS_UPDATE),
  validate(updateLeadSchema),
  (req, res, next) => leadController.update(req, res, next)
);

router.delete(
  '/:id',
  requirePermissions(PERMISSIONS.LEADS_DELETE),
  (req, res, next) => leadController.delete(req, res, next)
);

module.exports = router;

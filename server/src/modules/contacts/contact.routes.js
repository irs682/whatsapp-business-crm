const { Router } = require('express');
const contactController = require('./contact.controller');
const {
  createContactSchema,
  updateContactSchema,
  listContactQuerySchema,
} = require('./contact.validation');
const validate = require('../../middleware/validate.middleware');
const authenticate = require('../../middleware/auth.middleware');
const { requirePermissions } = require('../../middleware/rbac.middleware');
const PERMISSIONS = require('../../constants/permissions');

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermissions(PERMISSIONS.CONTACTS_READ),
  validate(listContactQuerySchema, 'query'),
  (req, res, next) => contactController.list(req, res, next)
);

router.get(
  '/:id',
  requirePermissions(PERMISSIONS.CONTACTS_READ),
  (req, res, next) => contactController.getById(req, res, next)
);

router.post(
  '/',
  requirePermissions(PERMISSIONS.CONTACTS_CREATE),
  validate(createContactSchema),
  (req, res, next) => contactController.create(req, res, next)
);

router.patch(
  '/:id',
  requirePermissions(PERMISSIONS.CONTACTS_UPDATE),
  validate(updateContactSchema),
  (req, res, next) => contactController.update(req, res, next)
);

router.delete(
  '/:id',
  requirePermissions(PERMISSIONS.CONTACTS_DELETE),
  (req, res, next) => contactController.delete(req, res, next)
);

module.exports = router;

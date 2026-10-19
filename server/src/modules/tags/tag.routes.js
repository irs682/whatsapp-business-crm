const { Router } = require('express');
const tagController = require('./tag.controller');
const {
  createTagSchema,
  updateTagSchema,
  listTagsQuerySchema,
} = require('./tag.validation');
const validate = require('../../middleware/validate.middleware');
const authenticate = require('../../middleware/auth.middleware');
const { requirePermissions } = require('../../middleware/rbac.middleware');
const PERMISSIONS = require('../../constants/permissions');

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermissions(PERMISSIONS.TAGS_READ),
  validate(listTagsQuerySchema, 'query'),
  (req, res, next) => tagController.list(req, res, next)
);

router.get(
  '/:id',
  requirePermissions(PERMISSIONS.TAGS_READ),
  (req, res, next) => tagController.getById(req, res, next)
);

router.post(
  '/',
  requirePermissions(PERMISSIONS.TAGS_MANAGE),
  validate(createTagSchema),
  (req, res, next) => tagController.create(req, res, next)
);

router.patch(
  '/:id',
  requirePermissions(PERMISSIONS.TAGS_MANAGE),
  validate(updateTagSchema),
  (req, res, next) => tagController.update(req, res, next)
);

router.delete(
  '/:id',
  requirePermissions(PERMISSIONS.TAGS_MANAGE),
  (req, res, next) => tagController.delete(req, res, next)
);

module.exports = router;

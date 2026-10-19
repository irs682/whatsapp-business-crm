const { Router } = require('express');
const userController = require('./users.controller');
const {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  updateUserDepartmentsSchema,
  listUsersQuerySchema,
} = require('./users.validation');
const validate = require('../../middleware/validate.middleware');
const authenticate = require('../../middleware/auth.middleware');
const { requirePermissions } = require('../../middleware/rbac.middleware');
const PERMISSIONS = require('../../constants/permissions');

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermissions(PERMISSIONS.USERS_READ),
  validate(listUsersQuerySchema, 'query'),
  (req, res, next) => userController.list(req, res, next)
);

router.get(
  '/:id',
  requirePermissions(PERMISSIONS.USERS_READ),
  (req, res, next) => userController.getById(req, res, next)
);

router.post(
  '/',
  requirePermissions(PERMISSIONS.USERS_CREATE),
  validate(createUserSchema),
  (req, res, next) => userController.create(req, res, next)
);

router.patch(
  '/:id',
  requirePermissions(PERMISSIONS.USERS_UPDATE),
  validate(updateUserSchema),
  (req, res, next) => userController.update(req, res, next)
);

router.patch(
  '/:id/status',
  requirePermissions(PERMISSIONS.USERS_UPDATE),
  validate(updateUserStatusSchema),
  (req, res, next) => userController.updateStatus(req, res, next)
);

router.put(
  '/:id/departments',
  requirePermissions(PERMISSIONS.USERS_UPDATE),
  validate(updateUserDepartmentsSchema),
  (req, res, next) => userController.updateDepartments(req, res, next)
);

router.delete(
  '/:id',
  requirePermissions(PERMISSIONS.USERS_DELETE),
  (req, res, next) => userController.delete(req, res, next)
);

module.exports = router;

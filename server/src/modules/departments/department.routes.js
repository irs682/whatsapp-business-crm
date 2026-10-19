const { Router } = require('express');
const departmentController = require('./department.controller');
const {
  createDepartmentSchema,
  updateDepartmentSchema,
  assignUserToDepartmentSchema,
  listDepartmentQuerySchema,
} = require('./department.validation');
const validate = require('../../middleware/validate.middleware');
const authenticate = require('../../middleware/auth.middleware');
const { requirePermissions } = require('../../middleware/rbac.middleware');
const PERMISSIONS = require('../../constants/permissions');

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermissions(PERMISSIONS.DEPARTMENTS_READ),
  validate(listDepartmentQuerySchema, 'query'),
  (req, res, next) => departmentController.list(req, res, next)
);

router.get(
  '/:id',
  requirePermissions(PERMISSIONS.DEPARTMENTS_READ),
  (req, res, next) => departmentController.getById(req, res, next)
);

router.post(
  '/',
  requirePermissions(PERMISSIONS.DEPARTMENTS_CREATE),
  validate(createDepartmentSchema),
  (req, res, next) => departmentController.create(req, res, next)
);

router.patch(
  '/:id',
  requirePermissions(PERMISSIONS.DEPARTMENTS_UPDATE),
  validate(updateDepartmentSchema),
  (req, res, next) => departmentController.update(req, res, next)
);

router.get(
  '/:id/users',
  requirePermissions(PERMISSIONS.DEPARTMENTS_READ),
  (req, res, next) => departmentController.getUsers(req, res, next)
);

router.post(
  '/:id/users',
  requirePermissions(PERMISSIONS.DEPARTMENTS_UPDATE),
  validate(assignUserToDepartmentSchema),
  (req, res, next) => departmentController.assignUser(req, res, next)
);

router.delete(
  '/:id/users/:userId',
  requirePermissions(PERMISSIONS.DEPARTMENTS_UPDATE),
  (req, res, next) => departmentController.removeUser(req, res, next)
);

router.delete(
  '/:id',
  requirePermissions(PERMISSIONS.DEPARTMENTS_DELETE),
  (req, res, next) => departmentController.delete(req, res, next)
);

module.exports = router;

const { Router } = require('express');
const taskController = require('./task.controller');
const {
  createTaskSchema,
  updateTaskSchema,
  listTasksQuerySchema,
} = require('./task.validation');
const validate = require('../../middleware/validate.middleware');
const authenticate = require('../../middleware/auth.middleware');
const { requirePermissions } = require('../../middleware/rbac.middleware');
const PERMISSIONS = require('../../constants/permissions');

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermissions(PERMISSIONS.TASKS_READ),
  validate(listTasksQuerySchema, 'query'),
  (req, res, next) => taskController.list(req, res, next)
);

router.get(
  '/:id',
  requirePermissions(PERMISSIONS.TASKS_READ),
  (req, res, next) => taskController.getById(req, res, next)
);

router.post(
  '/',
  requirePermissions(PERMISSIONS.TASKS_CREATE),
  validate(createTaskSchema),
  (req, res, next) => taskController.create(req, res, next)
);

router.patch(
  '/:id',
  requirePermissions(PERMISSIONS.TASKS_UPDATE),
  validate(updateTaskSchema),
  (req, res, next) => taskController.update(req, res, next)
);

router.delete(
  '/:id',
  requirePermissions(PERMISSIONS.TASKS_DELETE),
  (req, res, next) => taskController.delete(req, res, next)
);

module.exports = router;

const { Router } = require('express');
const noteController = require('./note.controller');
const { createNoteSchema, listNotesQuerySchema } = require('./note.validation');
const validate = require('../../middleware/validate.middleware');
const authenticate = require('../../middleware/auth.middleware');
const { requirePermissions } = require('../../middleware/rbac.middleware');
const PERMISSIONS = require('../../constants/permissions');

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermissions(PERMISSIONS.NOTES_READ),
  validate(listNotesQuerySchema, 'query'),
  (req, res, next) => noteController.list(req, res, next)
);

router.post(
  '/',
  requirePermissions(PERMISSIONS.NOTES_CREATE),
  validate(createNoteSchema),
  (req, res, next) => noteController.create(req, res, next)
);

router.delete(
  '/:id',
  requirePermissions(PERMISSIONS.NOTES_DELETE),
  (req, res, next) => noteController.delete(req, res, next)
);

module.exports = router;

const { Router } = require('express');
const reportController = require('./report.controller');
const authenticate = require('../../middleware/auth.middleware');
const { requirePermissions } = require('../../middleware/rbac.middleware');
const PERMISSIONS = require('../../constants/permissions');

const router = Router();

router.use(authenticate);

// Reports reading permissions
router.use(requirePermissions(PERMISSIONS.REPORTS_READ));

// 1. Executive Dashboard
router.get('/executive', (req, res, next) => reportController.executive(req, res, next));

// 2. Conversation & Shared Inbox Analytics
router.get('/conversations', (req, res, next) => reportController.conversations(req, res, next));

// 3. Agent Performance Analytics
router.get('/agents', (req, res, next) => reportController.agents(req, res, next));

// 4. Department Performance Analytics
router.get('/departments', (req, res, next) => reportController.departments(req, res, next));

// 5. Customer & Contact Analytics
router.get('/contacts', (req, res, next) => reportController.contacts(req, res, next));
router.get('/customers', (req, res, next) => reportController.contacts(req, res, next)); // Alias

// 6. Lead Pipeline Analytics
router.get('/leads', (req, res, next) => reportController.leads(req, res, next));

// 7. WhatsApp Delivery Analytics
router.get('/whatsapp', (req, res, next) => reportController.whatsapp(req, res, next));

// 8. Campaign Performance Analytics
router.get('/campaigns', (req, res, next) => reportController.campaigns(req, res, next));

// 9. Task Performance Analytics
router.get('/tasks', (req, res, next) => reportController.tasks(req, res, next));

// 10. Secure Report Export (supports POST /export and GET /export)
router.post(
  '/export',
  requirePermissions(PERMISSIONS.REPORTS_EXPORT),
  (req, res, next) => reportController.exportReport(req, res, next)
);
router.get(
  '/export',
  requirePermissions(PERMISSIONS.REPORTS_EXPORT),
  (req, res, next) => reportController.exportReport(req, res, next)
);

module.exports = router;

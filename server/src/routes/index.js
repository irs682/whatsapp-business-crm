const { Router } = require('express');

// Operational Phase 1 Modules
const authRoutes = require('../modules/auth/auth.routes');
const userRoutes = require('../modules/users/users.routes');
const departmentRoutes = require('../modules/departments/department.routes');
const contactRoutes = require('../modules/contacts/contact.routes');
const tagRoutes = require('../modules/tags/tag.routes');
const leadRoutes = require('../modules/leads/lead.routes');
const dashboardRoutes = require('../modules/dashboard/dashboard.routes');

// Placeholder Roadmap Modules
const roleRoutes = require('../modules/roles/role.routes');
const permissionRoutes = require('../modules/permissions/permission.routes');
const conversationRoutes = require('../modules/conversations/conversation.routes');
const messageRoutes = require('../modules/messages/message.routes');
const quickReplyRoutes = require('../modules/quick-replies/quickReply.routes');
const noteRoutes = require('../modules/notes/note.routes');
const taskRoutes = require('../modules/tasks/task.routes');
const campaignRoutes = require('../modules/campaigns/campaign.routes');
const templateRoutes = require('../modules/templates/template.routes');
const consentRoutes = require('../modules/consent/consent.routes');
const reportRoutes = require('../modules/reports/report.routes');
const auditRoutes = require('../modules/audit/audit.routes');
const notificationRoutes = require('../modules/notifications/notification.routes');
const whatsappModuleRoutes = require('../modules/whatsapp/whatsapp.routes');

// WhatsApp Integration Webhooks
const whatsappWebhookRoutes = require('../integrations/whatsapp/whatsapp.webhook');

const router = Router();

// Health Check Endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'whatsapp-business-crm-api',
  });
});

// Mount Routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/departments', departmentRoutes);
router.use('/contacts', contactRoutes);
router.use('/tags', tagRoutes);
router.use('/leads', leadRoutes);
router.use('/dashboard', dashboardRoutes);

// Mount Roadmap Modules
router.use('/roles', roleRoutes);
router.use('/permissions', permissionRoutes);
router.use('/conversations', conversationRoutes);
router.use('/messages', messageRoutes);
router.use('/quick-replies', quickReplyRoutes);
router.use('/notes', noteRoutes);
router.use('/tasks', taskRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/marketing/segments', require('../modules/marketing/segments/segment.routes'));
router.use('/marketing/automations', require('../modules/marketing/automations/automation.routes'));
router.use('/templates', templateRoutes);
router.use('/consent', consentRoutes);
router.use('/reports', reportRoutes);
router.use('/audit', auditRoutes);
router.use('/notifications', notificationRoutes);
router.use('/whatsapp', whatsappModuleRoutes);

// Mount WhatsApp Cloud API Integration & Webhook Endpoints
const whatsappIntegrationRoutes = require('../integrations/whatsapp/whatsapp.integration.routes');
router.use('/integrations/whatsapp', whatsappIntegrationRoutes);
router.use('/webhooks/whatsapp', whatsappWebhookRoutes);

module.exports = router;

const { Router } = require('express');
const whatsAppConfig = require('./whatsapp.config');
const whatsAppService = require('./whatsapp.service');
const prisma = require('../../config/prisma');
const authenticate = require('../../middleware/auth.middleware');
const { requirePermissions } = require('../../middleware/rbac.middleware');
const PERMISSIONS = require('../../constants/permissions');
const ApiResponse = require('../../utils/apiResponse');

const router = Router();

router.use(authenticate);

/**
 * GET /api/v1/integrations/whatsapp/status
 * Reports WhatsApp Cloud API integration readiness and operating mode
 */
router.get('/status', (req, res) => {
  const status = whatsAppConfig.getReadinessStatus();
  return ApiResponse.success(res, 'WhatsApp readiness status retrieved', status);
});

/**
 * GET /api/v1/integrations/whatsapp/configuration
 * Reports non-sensitive configuration parameters for administrators
 */
router.get(
  '/configuration',
  requirePermissions(PERMISSIONS.DEPARTMENTS_MANAGE),
  (req, res) => {
    const configData = {
      enabled: whatsAppConfig.enabled,
      mode: whatsAppConfig.mode,
      apiVersion: whatsAppConfig.apiVersion,
      baseUrl: whatsAppConfig.baseUrl,
      phoneNumberIdConfigured: Boolean(whatsAppConfig.phoneNumberId),
      businessAccountIdConfigured: Boolean(whatsAppConfig.businessAccountId),
      appSecretConfigured: Boolean(whatsAppConfig.appSecret),
      verifyTokenConfigured: Boolean(whatsAppConfig.verifyToken),
      webhookPath: whatsAppConfig.webhookPath,
    };
    return ApiResponse.success(res, 'WhatsApp configuration retrieved', configData);
  }
);

/**
 * GET /api/v1/integrations/whatsapp/templates
 * Retrieves pre-approved Meta WhatsApp templates from local database
 */
router.get('/templates', async (req, res, next) => {
  try {
    const templates = await prisma.messageTemplate.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
    return ApiResponse.success(res, 'WhatsApp templates retrieved', templates);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/integrations/whatsapp/templates/sync
 * Refreshes or seeds standard Meta WhatsApp templates
 */
router.post(
  '/templates/sync',
  requirePermissions(PERMISSIONS.CAMPAIGNS_MANAGE),
  async (req, res, next) => {
    try {
      const defaultTemplates = [
        {
          name: 'welcome_greeting',
          category: 'UTILITY',
          language: 'en_US',
          body: 'Hello {{1}}, welcome to Stech Solutions! How can we assist you today?',
          status: 'APPROVED',
          metaTemplateId: 'meta_tpl_welcome_greeting',
        },
        {
          name: 'support_followup',
          category: 'UTILITY',
          language: 'en_US',
          body: 'Hello {{1}}, following up on your recent inquiry regarding {{2}}. Please let us know if you need further help.',
          status: 'APPROVED',
          metaTemplateId: 'meta_tpl_support_followup',
        },
        {
          name: 'order_status_update',
          category: 'UTILITY',
          language: 'en_US',
          body: 'Hi {{1}}, your order #{{2}} status is now: {{3}}.',
          status: 'APPROVED',
          metaTemplateId: 'meta_tpl_order_update',
        },
      ];

      for (const tpl of defaultTemplates) {
        await prisma.messageTemplate.upsert({
          where: { name: tpl.name },
          update: { status: tpl.status, body: tpl.body },
          create: tpl,
        });
      }

      const all = await prisma.messageTemplate.findMany({ where: { deletedAt: null } });
      return ApiResponse.success(res, 'Templates synchronized successfully', all);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;

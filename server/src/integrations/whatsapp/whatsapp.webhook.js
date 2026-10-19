const { Router } = require('express');
const whatsAppWebhookController = require('./whatsapp.webhook.controller');

const router = Router();

/**
 * GET /api/v1/webhooks/whatsapp
 * Meta Webhook subscription verification endpoint
 */
router.get('/', (req, res, next) => whatsAppWebhookController.verify(req, res, next));

/**
 * POST /api/v1/webhooks/whatsapp
 * Inbound messages, delivery receipts, and status webhooks
 */
router.post('/', (req, res, next) => whatsAppWebhookController.handleEvent(req, res, next));

module.exports = router;

const { Router } = require('express');
const whatsAppService = require('./whatsapp.service');
const env = require('../../config/env');
const ApiResponse = require('../../utils/apiResponse');

const router = Router();

/**
 * GET /api/v1/webhooks/whatsapp
 * Webhook Verification Handler (Meta Graph API requirement)
 */
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const { verified, challenge: validChallenge } = whatsAppService.verifyWebhook(
    mode,
    token,
    challenge,
    env.WHATSAPP_VERIFY_TOKEN
  );

  if (verified) {
    return res.status(200).send(validChallenge);
  }

  return res.status(403).json({ success: false, message: 'Webhook verification token mismatch' });
});

/**
 * POST /api/v1/webhooks/whatsapp
 * Inbound Webhook Notifications & Receipts Receiver
 */
router.post('/', async (req, res, next) => {
  try {
    const result = await whatsAppService.handleWebhookEvent(req.body);
    // Meta requires an immediate 200 OK acknowledgment
    return ApiResponse.success(res, 'EVENT_RECEIVED', result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

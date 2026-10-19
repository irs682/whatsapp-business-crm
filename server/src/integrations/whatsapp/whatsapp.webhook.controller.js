const crypto = require('crypto');
const whatsAppService = require('./whatsapp.service');
const whatsAppConfig = require('./whatsapp.config');
const { WhatsAppWebhookSignatureError } = require('./whatsapp.errors');
const logger = require('../../utils/logger');
const ApiResponse = require('../../utils/apiResponse');

class WhatsAppWebhookController {
  /**
   * GET /api/v1/webhooks/whatsapp
   * Meta Hub challenge verification
   */
  verify(req, res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === whatsAppConfig.verifyToken) {
      logger.info('[WhatsAppWebhook] Verification challenge accepted');
      return res.status(200).send(challenge);
    }

    logger.warn('[WhatsAppWebhook] Verification rejected: token mismatch', {
      mode,
      receivedToken: token ? `${token.slice(0, 3)}***` : null,
    });
    return res.status(403).json({ success: false, message: 'Webhook verification token mismatch' });
  }

  /**
   * Helper: Timing-safe HMAC-SHA256 signature verification
   */
  validateSignature(rawBody, signatureHeader, appSecret) {
    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
      return false;
    }

    const providedSignatureHex = signatureHeader.slice(7);
    const expectedSignatureHex = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody || '')
      .digest('hex');

    const providedBuf = Buffer.from(providedSignatureHex, 'hex');
    const expectedBuf = Buffer.from(expectedSignatureHex, 'hex');

    if (providedBuf.length !== expectedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(providedBuf, expectedBuf);
  }

  /**
   * POST /api/v1/webhooks/whatsapp
   * Inbound WhatsApp messages, status receipts, and event processing
   */
  async handleEvent(req, res, next) {
    try {
      const signatureHeader = req.headers['x-hub-signature-256'];
      const appSecret = whatsAppConfig.appSecret;

      // Enforce HMAC-SHA256 signature verification
      const shouldEnforceSignature =
        whatsAppConfig.mode === 'production' ||
        whatsAppConfig.mode === 'test' ||
        (Boolean(signatureHeader) && Boolean(appSecret));

      if (shouldEnforceSignature) {
        if (!signatureHeader) {
          logger.warn('[WhatsAppWebhook] Missing X-Hub-Signature-256 header');
          return res.status(401).json({ success: false, message: 'Missing webhook signature' });
        }

        const isValid = this.validateSignature(req.rawBody, signatureHeader, appSecret);
        if (!isValid) {
          logger.warn('[WhatsAppWebhook] Invalid X-Hub-Signature-256 signature');
          return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
        }
      }

      const payload = req.body;
      // In test mode or when requested via x-test-sync header, process synchronously
      if (process.env.NODE_ENV === 'test' || req.headers['x-test-sync'] === 'true') {
        await whatsAppService.processWebhookPayload(payload);
        return res.status(200).json({ success: true, message: 'EVENT_RECEIVED' });
      }

      // Prompt acknowledgment to Meta (must be HTTP 200 within 5 seconds in production)
      res.status(200).json({ success: true, message: 'EVENT_RECEIVED' });

      // Process event asynchronously
      setImmediate(async () => {
        try {
          await whatsAppService.processWebhookPayload(payload);
        } catch (err) {
          logger.error('[WhatsAppWebhook] Error processing asynchronous webhook event:', err);
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WhatsAppWebhookController();

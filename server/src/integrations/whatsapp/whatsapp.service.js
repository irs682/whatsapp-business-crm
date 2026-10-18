const whatsAppClient = require('./whatsapp.client');
const logger = require('../../utils/logger');

class WhatsAppService {
  /**
   * Process incoming webhook verification from Meta Graph API
   */
  verifyWebhook(mode, token, challenge, expectedToken) {
    if (mode === 'subscribe' && token === expectedToken) {
      logger.info('Meta WhatsApp Webhook subscription verified successfully');
      return { verified: true, challenge };
    }
    logger.warn('Meta WhatsApp Webhook verification mismatch', { mode, tokenReceived: token });
    return { verified: false, challenge: null };
  }

  /**
   * Process incoming webhook event payload from Meta
   */
  async handleWebhookEvent(eventPayload) {
    logger.info('WhatsApp Webhook Event received:', JSON.stringify(eventPayload, null, 2));

    // Architectural placeholders for Phase 4:
    // 1. Inbound messages: Find or create Contact by wa_id -> Find or create active Conversation -> Persist Message (direction: INBOUND)
    // 2. Status receipts: Update Message status to DELIVERED/READ/FAILED based on wamid
    // 3. Opt-out processing: Detect keywords like 'STOP', 'UNSUBSCRIBE' -> update Contact.isOptedOut = true, consentStatus = REVOKED
    // 4. Idempotency: Deduplicate incoming events using wamid stored in database

    return { received: true };
  }

  /**
   * 24-hour Customer Service Window validation helper
   */
  isWithinCustomerServiceWindow(lastInboundMessageAt) {
    if (!lastInboundMessageAt) return false;
    const windowMs = 24 * 60 * 60 * 1000;
    return Date.now() - new Date(lastInboundMessageAt).getTime() <= windowMs;
  }
}

module.exports = new WhatsAppService();

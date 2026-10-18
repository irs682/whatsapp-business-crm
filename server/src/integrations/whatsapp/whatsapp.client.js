const env = require('../../config/env');
const logger = require('../../utils/logger');

/**
 * Meta WhatsApp Cloud API HTTP Client Wrapper
 * Handles outbound requests to Meta Graph API
 */
class WhatsAppClient {
  constructor() {
    this.baseUrl = env.WHATSAPP_BASE_URL;
    this.version = env.WHATSAPP_API_VERSION;
    this.phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
    this.accessToken = env.WHATSAPP_ACCESS_TOKEN;
  }

  get endpoint() {
    return `${this.baseUrl}/${this.version}/${this.phoneNumberId}/messages`;
  }

  /**
   * Future implementation: Outbound message transmission
   * @param {Object} payload 
   */
  async sendMessage(payload) {
    if (!this.accessToken || !this.phoneNumberId) {
      logger.warn('[WhatsAppClient] Credentials not configured. Simulated dispatch:', payload);
      return { simulated: true, messageId: `wamid.simulated.${Date.now()}` };
    }

    // TODO: Phase 4 - Perform HTTPS POST with Axios to Meta Graph API with retry & exponential backoff
    logger.info('[WhatsAppClient] Dispatching message to Meta Cloud API endpoint', this.endpoint);
    return { status: 'queued', payload };
  }

  /**
   * Future implementation: Template message broadcast
   */
  async sendTemplateMessage(to, templateName, languageCode = 'en_US', components = []) {
    return this.sendMessage({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    });
  }
}

module.exports = new WhatsAppClient();

const axios = require('axios');
const whatsAppConfig = require('./whatsapp.config');
const WHATSAPP_CONSTANTS = require('./whatsapp.constants');
const { WhatsAppError } = require('./whatsapp.errors');
const logger = require('../../utils/logger');

/**
 * Official Meta WhatsApp Cloud API Client
 * Supports mock, test, and production modes with timeout, exponential backoff, and retry handling.
 */
class WhatsAppClient {
  constructor() {
    this.config = whatsAppConfig;
    this.http = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  get endpoint() {
    return `/${this.config.apiVersion}/${this.config.phoneNumberId}/messages`;
  }

  /**
   * Helper to normalize recipient phone numbers to digits only without leading '+'
   */
  normalizePhoneNumber(phone) {
    if (!phone) return '';
    return phone.replace(/[^\d]/g, '');
  }

  /**
   * Core request dispatcher with retry mechanism
   */
  async executeWithRetry(apiCall, maxRetries = 2) {
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        return await apiCall();
      } catch (error) {
        attempt++;
        const status = error.response?.status;
        const metaError = error.response?.data?.error;
        const errorCode = metaError?.code || status || -1;

        const isRetryable =
          WHATSAPP_CONSTANTS.RETRYABLE_ERROR_CODES.includes(errorCode) ||
          error.code === 'ECONNABORTED' ||
          error.code === 'ETIMEDOUT';

        if (attempt > maxRetries || !isRetryable) {
          logger.error('[WhatsAppClient] API call failed:', {
            status,
            message: metaError?.message || error.message,
            code: errorCode,
          });
          throw new WhatsAppError(
            metaError?.message || error.message,
            status || 500,
            metaError?.type || 'WHATSAPP_API_ERROR',
            metaError
          );
        }

        // Exponential backoff with jitter
        const backoffMs = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 500, 5000);
        logger.warn(`[WhatsAppClient] Transient error (${errorCode}). Retrying in ${Math.round(backoffMs)}ms (Attempt ${attempt}/${maxRetries})...`);
        await new Promise((res) => setTimeout(res, backoffMs));
      }
    }
  }

  /**
   * Send an outbound message payload to Meta Graph API
   */
  async dispatchMessage(payload) {
    // 1. Mock Mode (for safe local development and test automation without live credentials)
    if (this.config.mode === 'mock' || !this.config.accessToken || !this.config.phoneNumberId) {
      const recipient = payload.to || 'test_recipient';
      const simulatedWamid = `wamid.HBgL${recipient}${Date.now()}`;
      logger.info(`[WhatsAppClient:Mock] Dispatched ${payload.type} message to ${recipient} (Wamid: ${simulatedWamid})`);

      return {
        messaging_product: 'whatsapp',
        contacts: [{ input: recipient, wa_id: recipient }],
        messages: [{ id: simulatedWamid }],
        _mode: 'mock',
      };
    }

    // 2. Production or Test Mode (Live Meta Graph API dispatch)
    return this.executeWithRetry(async () => {
      const response = await this.http.post(this.endpoint, payload, {
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
        },
      });
      return response.data;
    });
  }

  /**
   * Send free-form text message
   */
  async sendTextMessage(to, text, previewUrl = false) {
    const cleanTo = this.normalizePhoneNumber(to);
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'text',
      text: {
        body: text,
        preview_url: Boolean(previewUrl),
      },
    };
    return this.dispatchMessage(payload);
  }

  /**
   * Send pre-approved WhatsApp template message
   */
  async sendTemplateMessage(to, templateName, languageCode = 'en_US', components = []) {
    const cleanTo = this.normalizePhoneNumber(to);
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components: components.length > 0 ? components : undefined,
      },
    };
    return this.dispatchMessage(payload);
  }

  /**
   * Send media message (image, document, audio, video)
   */
  async sendMediaMessage(to, mediaType, mediaIdOrUrl, caption = '', filename = null) {
    const cleanTo = this.normalizePhoneNumber(to);
    const mediaObject = {};

    if (mediaIdOrUrl.startsWith('http://') || mediaIdOrUrl.startsWith('https://')) {
      mediaObject.link = mediaIdOrUrl;
    } else {
      mediaObject.id = mediaIdOrUrl;
    }

    if (caption && (mediaType === 'image' || mediaType === 'video' || mediaType === 'document')) {
      mediaObject.caption = caption;
    }
    if (filename && mediaType === 'document') {
      mediaObject.filename = filename;
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: mediaType,
      [mediaType]: mediaObject,
    };

    return this.dispatchMessage(payload);
  }

  /**
   * Get media metadata from Meta Graph API
   */
  async getMediaMetadata(mediaId) {
    if (this.config.mode === 'mock' || !this.config.accessToken) {
      return {
        id: mediaId,
        mime_type: 'image/jpeg',
        sha256: 'simulated_sha256_mock_hash',
        file_size: 10240,
        url: `https://lookaside.fbsbx.com/whatsapp_business/attachments/simulated/${mediaId}`,
      };
    }

    const response = await this.http.get(`/${this.config.apiVersion}/${mediaId}`, {
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
      },
    });
    return response.data;
  }
}

module.exports = new WhatsAppClient();

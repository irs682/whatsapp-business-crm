const env = require('../../config/env');
const logger = require('../../utils/logger');

/**
 * Meta WhatsApp Cloud API Configuration Manager
 * Manages configuration, validation, modes, and safe readiness reporting
 */
class WhatsAppConfig {
  constructor() {
    this.enabled = env.WHATSAPP_ENABLED;
    this.mode = env.WHATSAPP_MODE || 'mock'; // 'mock' | 'test' | 'production'
    this.apiVersion = env.WHATSAPP_API_VERSION || 'v21.0';
    this.baseUrl = env.WHATSAPP_BASE_URL || 'https://graph.facebook.com';
    this.appId = env.WHATSAPP_APP_ID || '';
    this.appSecret = env.WHATSAPP_APP_SECRET || '';
    this.accessToken = env.WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.businessAccountId = env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';
    this.verifyToken = env.WHATSAPP_VERIFY_TOKEN || 'crm_whatsapp_verify_token_default';
    this.webhookPath = env.WHATSAPP_WEBHOOK_PATH || '/api/v1/webhooks/whatsapp';

    this.validateOnStartup();
  }

  validateOnStartup() {
    if (!this.enabled) {
      logger.info('[WhatsAppConfig] WhatsApp integration is disabled via WHATSAPP_ENABLED=false');
      return;
    }

    if (this.mode === 'production') {
      const missing = [];
      if (!this.accessToken) missing.push('WHATSAPP_ACCESS_TOKEN');
      if (!this.phoneNumberId) missing.push('WHATSAPP_PHONE_NUMBER_ID');
      if (!this.appSecret) missing.push('WHATSAPP_APP_SECRET');
      if (!this.verifyToken) missing.push('WHATSAPP_VERIFY_TOKEN');

      if (missing.length > 0) {
        logger.error(`[WhatsAppConfig] Production WhatsApp mode requires credentials. Missing: ${missing.join(', ')}`);
      } else {
        logger.info('[WhatsAppConfig] Production WhatsApp Cloud API configuration loaded successfully');
      }
    } else if (this.mode === 'test') {
      logger.info(`[WhatsAppConfig] Test WhatsApp mode active. Graph API ${this.apiVersion}`);
    } else {
      logger.info(`[WhatsAppConfig] Mock WhatsApp mode active. Simulated Meta Graph API adapter ready`);
    }
  }

  /**
   * Safe status report (never exposes tokens or secrets)
   */
  getReadinessStatus() {
    const isMock = this.mode === 'mock';
    const hasCredentials = Boolean(this.accessToken && this.phoneNumberId && this.appSecret);

    return {
      enabled: this.enabled,
      mode: this.mode,
      apiVersion: this.apiVersion,
      phoneNumberIdConfigured: Boolean(this.phoneNumberId),
      phoneNumberIdMasked: this.phoneNumberId ? `${this.phoneNumberId.slice(0, 4)}...${this.phoneNumberId.slice(-4)}` : null,
      businessAccountIdConfigured: Boolean(this.businessAccountId),
      appSecretConfigured: Boolean(this.appSecret),
      accessTokenConfigured: Boolean(this.accessToken),
      verifyTokenConfigured: Boolean(this.verifyToken),
      webhookPath: this.webhookPath,
      isReady: this.enabled && (isMock || hasCredentials),
    };
  }
}

module.exports = new WhatsAppConfig();

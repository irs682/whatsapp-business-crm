const ApiError = require('../../errors/apiError');

/**
 * Standardized Meta WhatsApp Cloud API Error Classes
 */
class WhatsAppError extends ApiError {
  constructor(message, status = 500, code = 'WHATSAPP_ERROR', details = null) {
    super(status, message, details ? [details] : []);
    this.name = 'WhatsAppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

class WhatsAppWebhookSignatureError extends WhatsAppError {
  constructor(message = 'Invalid webhook HMAC signature') {
    super(message, 401, 'INVALID_WEBHOOK_SIGNATURE');
    this.name = 'WhatsAppWebhookSignatureError';
  }
}

class WhatsAppPolicyWindowError extends WhatsAppError {
  constructor(message = 'Outside 24-hour customer service window. Free-form messaging disallowed; use pre-approved WhatsApp template.') {
    super(message, 422, 'OUTSIDE_24H_WINDOW');
    this.name = 'WhatsAppPolicyWindowError';
  }
}

class WhatsAppTemplateValidationError extends WhatsAppError {
  constructor(message = 'Invalid template or missing parameter variables', details = null) {
    super(message, 400, 'INVALID_TEMPLATE_PARAMETERS', details);
    this.name = 'WhatsAppTemplateValidationError';
  }
}

class WhatsAppMediaValidationError extends WhatsAppError {
  constructor(message = 'Media file violates size or MIME type constraints', details = null) {
    super(message, 400, 'INVALID_MEDIA_CONSTRAINTS', details);
    this.name = 'WhatsAppMediaValidationError';
  }
}

module.exports = {
  WhatsAppError,
  WhatsAppWebhookSignatureError,
  WhatsAppPolicyWindowError,
  WhatsAppTemplateValidationError,
  WhatsAppMediaValidationError,
};

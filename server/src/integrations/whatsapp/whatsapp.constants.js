/**
 * Official Meta WhatsApp Cloud API Constants
 */
const WHATSAPP_CONSTANTS = {
  // 24-Hour Customer Service Policy Window in Milliseconds
  CUSTOMER_SERVICE_WINDOW_MS: 24 * 60 * 60 * 1000,

  // Supported Inbound & Outbound Message Types
  MESSAGE_TYPES: {
    TEXT: 'text',
    IMAGE: 'image',
    DOCUMENT: 'document',
    AUDIO: 'audio',
    VIDEO: 'video',
    LOCATION: 'location',
    TEMPLATE: 'template',
    INTERACTIVE: 'interactive',
    REACTION: 'reaction',
    CONTACTS: 'contacts',
  },

  // WhatsApp Message Status Precedence (Ensures Non-Regressive State Machine)
  STATUS_HIERARCHY: {
    QUEUED: 1,
    LOCAL_SAVED: 1,
    SENT: 2,
    DELIVERED: 3,
    READ: 4,
    FAILED: 5,
  },

  // Opt-out Keywords (Meta Compliance)
  OPT_OUT_KEYWORDS: ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'OPTOUT', 'QUIT'],
  OPT_IN_KEYWORDS: ['START', 'SUBSCRIBE', 'UNSTOP', 'YES'],

  // Media Constraints per Official Meta Cloud API
  MEDIA_CONSTRAINTS: {
    IMAGE: {
      MAX_BYTES: 5 * 1024 * 1024, // 5MB
      MIME_TYPES: ['image/jpeg', 'image/png'],
    },
    DOCUMENT: {
      MAX_BYTES: 100 * 1024 * 1024, // 100MB
      MIME_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'],
    },
    AUDIO: {
      MAX_BYTES: 16 * 1024 * 1024, // 16MB
      MIME_TYPES: ['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg'],
    },
    VIDEO: {
      MAX_BYTES: 16 * 1024 * 1024, // 16MB
      MIME_TYPES: ['video/mp4', 'video/3gp'],
    },
  },

  // Transient Error Codes Eligible for Automatic Retry
  RETRYABLE_ERROR_CODES: [
    130429, // Rate limit hit
    131030, // Request timeout
    -1,     // Network connection reset / timeout
    500,    // Meta internal server error
    503,    // Service unavailable
    504,    // Gateway timeout
  ],
};

module.exports = WHATSAPP_CONSTANTS;

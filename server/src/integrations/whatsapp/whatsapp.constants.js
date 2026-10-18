const WHATSAPP_CONSTANTS = {
  WEBHOOK_MODE: 'subscribe',
  MESSAGE_STATUSES: {
    SENT: 'sent',
    DELIVERED: 'delivered',
    READ: 'read',
    FAILED: 'failed',
  },
  NOTIFICATION_TYPES: {
    MESSAGES: 'messages',
    MESSAGE_TEMPLATE_STATUS_UPDATE: 'message_template_status_update',
  },
  INTERACTION_TIMEOUT_HOURS: 24, // Meta 24-hour customer care window
};

module.exports = WHATSAPP_CONSTANTS;

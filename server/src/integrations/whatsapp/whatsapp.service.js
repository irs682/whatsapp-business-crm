const prisma = require('../../config/prisma');
const whatsAppClient = require('./whatsapp.client');
const whatsAppConfig = require('./whatsapp.config');
const WHATSAPP_CONSTANTS = require('./whatsapp.constants');
const {
  WhatsAppError,
  WhatsAppPolicyWindowError,
  WhatsAppTemplateValidationError,
} = require('./whatsapp.errors');
const logger = require('../../utils/logger');
const { logActivity } = require('../../utils/activityLogger');
const { getIO } = require('../../socket');

/**
 * High-Level Meta WhatsApp Cloud API Service
 * Handles webhook event processing, message ingestion, status receipts,
 * 24-hour customer service window validation, and outbound messaging.
 */
class WhatsAppService {
  constructor() {
    this.client = whatsAppClient;
    this.config = whatsAppConfig;
  }

  /**
   * 24-hour Customer Service Window validation helper
   * Meta Policy: Free-form messaging permitted only within 24 hours of customer's last inbound message.
   */
  isWithinCustomerServiceWindow(lastInboundMessageAt) {
    if (!lastInboundMessageAt) return false;
    const lastMsgTime = new Date(lastInboundMessageAt).getTime();
    if (isNaN(lastMsgTime)) return false;
    return Date.now() - lastMsgTime <= WHATSAPP_CONSTANTS.CUSTOMER_SERVICE_WINDOW_MS;
  }

  /**
   * Calculate remaining time in milliseconds for the 24-hour customer service window
   */
  getWindowRemainingMs(lastInboundMessageAt) {
    if (!lastInboundMessageAt) return 0;
    const expiresAt = new Date(lastInboundMessageAt).getTime() + WHATSAPP_CONSTANTS.CUSTOMER_SERVICE_WINDOW_MS;
    const remaining = expiresAt - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Process all incoming webhook payloads from Meta
   */
  async processWebhookPayload(payload) {
    if (!payload || !payload.entry || !Array.isArray(payload.entry)) {
      logger.warn('[WhatsAppService] Received empty or malformed webhook payload');
      return;
    }

    for (const entry of payload.entry) {
      if (!entry.changes || !Array.isArray(entry.changes)) continue;

      for (const change of entry.changes) {
        if (change.field !== 'messages' || !change.value) continue;

        const value = change.value;

        // 1. Process Inbound Messages
        if (value.messages && Array.isArray(value.messages)) {
          for (const msg of value.messages) {
            await this.handleInboundMessage(msg, value.contacts, value.metadata);
          }
        }

        // 2. Process Delivery and Read Status Receipts
        if (value.statuses && Array.isArray(value.statuses)) {
          for (const statusItem of value.statuses) {
            await this.handleStatusReceipt(statusItem);
          }
        }
      }
    }
  }

  /**
   * Ingest and persist an incoming WhatsApp message
   */
  async handleInboundMessage(rawMessage, contactsMeta = [], metadata = {}) {
    const waMessageId = rawMessage.id;
    if (!waMessageId) return;

    // A. Idempotency Check (Prevent duplicate insertion of same wamid)
    const existingMessage = await prisma.message.findUnique({
      where: { waMessageId },
    });
    if (existingMessage) {
      logger.info(`[WhatsAppService] Skipping duplicate message event (Wamid: ${waMessageId})`);
      return;
    }

    const fromNumber = rawMessage.from;
    const contactProfile = contactsMeta.find((c) => c.wa_id === fromNumber)?.profile;
    const contactName = contactProfile?.name || 'WhatsApp Contact';
    const messageTimestamp = rawMessage.timestamp
      ? new Date(Number(rawMessage.timestamp) * 1000)
      : new Date();

    // B. Match or Create Contact
    const normalizedPhone = fromNumber.startsWith('+') ? fromNumber : `+${fromNumber}`;
    let contact = await prisma.contact.findFirst({
      where: {
        OR: [
          { phone: normalizedPhone },
          { phone: fromNumber },
          { waId: fromNumber },
        ],
        deletedAt: null,
      },
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          phone: normalizedPhone,
          waId: fromNumber,
          firstName: contactName,
          source: 'WHATSAPP',
          consentStatus: 'GRANTED',
        },
      });
      logger.info(`[WhatsAppService] Created new contact for incoming WhatsApp message: ${contact.phone}`);
    }

    // C. Check Opt-Out Compliance Keywords (e.g. STOP, UNSUBSCRIBE)
    if (rawMessage.type === 'text' && rawMessage.text?.body) {
      const trimmedText = rawMessage.text.body.trim().toUpperCase();
      if (WHATSAPP_CONSTANTS.OPT_OUT_KEYWORDS.includes(trimmedText)) {
        await prisma.contact.update({
          where: { id: contact.id },
          data: {
            isOptedOut: true,
            optOutAt: new Date(),
            consentStatus: 'REVOKED',
          },
        });
        await logActivity({
          actorId: null,
          action: 'CONSENT_OPT_OUT',
          entityType: 'CONTACT',
          entityId: contact.id,
          contactId: contact.id,
          description: `Customer sent opt-out keyword "${trimmedText}"`,
        });
      } else if (WHATSAPP_CONSTANTS.OPT_IN_KEYWORDS.includes(trimmedText) && contact.isOptedOut) {
        await prisma.contact.update({
          where: { id: contact.id },
          data: {
            isOptedOut: false,
            optOutAt: null,
            consentStatus: 'GRANTED',
          },
        });
      }
    }

    // D. Find or Create Active Conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        contactId: contact.id,
        status: { in: ['OPEN', 'PENDING'] },
        deletedAt: null,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (conversation) {
      // Re-activate existing conversation and update inbound timestamp
      conversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          status: 'OPEN',
          lastMessageAt: messageTimestamp,
          lastInboundMessageAt: messageTimestamp,
          unreadCount: { increment: 1 },
        },
      });
    } else {
      // Assign to contact's department if exists, otherwise fallback to general queue
      conversation = await prisma.conversation.create({
        data: {
          contactId: contact.id,
          channel: 'WHATSAPP',
          status: 'OPEN',
          priority: 'NORMAL',
          departmentId: contact.departmentId || null,
          unreadCount: 1,
          lastMessageAt: messageTimestamp,
          lastInboundMessageAt: messageTimestamp,
        },
      });
      logger.info(`[WhatsAppService] Initialized new conversation ${conversation.id} for contact ${contact.id}`);
    }

    // E. Map Message Type & Content
    let msgType = 'TEXT';
    let textBody = '';
    let mediaUrl = null;

    switch (rawMessage.type) {
      case 'text':
        msgType = 'TEXT';
        textBody = rawMessage.text?.body || '';
        break;
      case 'image':
        msgType = 'IMAGE';
        textBody = rawMessage.image?.caption || '[Image]';
        mediaUrl = rawMessage.image?.id || null;
        break;
      case 'document':
        msgType = 'DOCUMENT';
        textBody = rawMessage.document?.caption || rawMessage.document?.filename || '[Document]';
        mediaUrl = rawMessage.document?.id || null;
        break;
      case 'audio':
        msgType = 'AUDIO';
        textBody = '[Voice Note]';
        mediaUrl = rawMessage.audio?.id || null;
        break;
      case 'video':
        msgType = 'VIDEO';
        textBody = rawMessage.video?.caption || '[Video]';
        mediaUrl = rawMessage.video?.id || null;
        break;
      case 'location':
        msgType = 'LOCATION';
        textBody = `Location: ${rawMessage.location?.latitude}, ${rawMessage.location?.longitude}`;
        break;
      case 'interactive':
        msgType = 'INTERACTIVE';
        textBody =
          rawMessage.interactive?.button_reply?.title ||
          rawMessage.interactive?.list_reply?.title ||
          '[Interactive Response]';
        break;
      default:
        msgType = 'TEXT';
        textBody = `[Unsupported Meta message type: ${rawMessage.type}]`;
    }

    // F. Persist Message Record
    const savedMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'INBOUND',
        type: msgType,
        text: textBody,
        mediaUrl,
        metadata: rawMessage,
        waMessageId,
        status: 'DELIVERED', // Since inbound message has safely arrived at our webhook
      },
    });

    await logActivity({
      actorId: null,
      action: 'WHATSAPP_MESSAGE_RECEIVED',
      entityType: 'MESSAGE',
      entityId: savedMessage.id,
      contactId: contact.id,
      description: `Inbound WhatsApp message from ${contact.phone}`,
    });

    // G. Broadcast Real-Time Events via Socket.IO
    try {
      const io = getIO();
      // Conversation room
      io.to(`conversation:${conversation.id}`).emit('message.created', {
        conversationId: conversation.id,
        message: savedMessage,
      });

      // Department room
      if (conversation.departmentId) {
        io.to(`dept:${conversation.departmentId}`).emit('conversation.updated', conversation);
        io.to(`dept:${conversation.departmentId}`).emit('message.created', {
          conversationId: conversation.id,
          message: savedMessage,
        });
      }
    } catch (err) {
      // Socket.IO may not be active in isolated unit test runner
    }

    return savedMessage;
  }

  /**
   * Process Meta Delivery & Read Status Receipts
   * Non-regressive state machine: QUEUED < SENT < DELIVERED < READ
   */
  async handleStatusReceipt(statusItem) {
    const waMessageId = statusItem.id;
    if (!waMessageId) return;

    const message = await prisma.message.findUnique({
      where: { waMessageId },
    });

    if (!message) {
      logger.info(`[WhatsAppService] Received status update for untracked message Wamid: ${waMessageId}`);
      return;
    }

    // Map Meta status string to Prisma enum
    let newStatus = 'QUEUED';
    switch (statusItem.status) {
      case 'sent':
        newStatus = 'SENT';
        break;
      case 'delivered':
        newStatus = 'DELIVERED';
        break;
      case 'read':
        newStatus = 'READ';
        break;
      case 'failed':
        newStatus = 'FAILED';
        break;
      default:
        return;
    }

    // Non-regressive check: do not overwrite READ with DELIVERED or SENT if out of order
    const currentPrecedence = WHATSAPP_CONSTANTS.STATUS_HIERARCHY[message.status] || 0;
    const newPrecedence = WHATSAPP_CONSTANTS.STATUS_HIERARCHY[newStatus] || 0;

    if (newStatus !== 'FAILED' && newPrecedence <= currentPrecedence) {
      logger.info(`[WhatsAppService] Ignoring regressive status update (${message.status} -> ${newStatus}) for ${waMessageId}`);
      return;
    }

    const failureReason =
      newStatus === 'FAILED'
        ? statusItem.errors?.[0]?.title || statusItem.errors?.[0]?.message || 'Meta delivery failed'
        : null;

    const updatedMessage = await prisma.message.update({
      where: { id: message.id },
      data: {
        status: newStatus,
        failureReason,
      },
    });

    // Real-Time Socket.IO Notification
    try {
      const io = getIO();
      io.to(`conversation:${message.conversationId}`).emit('message.updated', {
        conversationId: message.conversationId,
        messageId: message.id,
        status: newStatus,
        failureReason,
      });
    } catch (err) {
      // Ignore in tests
    }

    return updatedMessage;
  }

  /**
   * Outbound: Send free-form WhatsApp message to customer
   */
  async sendOutboundText(conversationId, text, user) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { contact: true },
    });

    if (!conversation) {
      throw new WhatsAppError('Conversation not found', 404, 'NOT_FOUND');
    }

    // 1. Department Access Verification
    if (
      user.role !== 'SUPER_ADMIN' &&
      user.role !== 'ADMIN' &&
      user.departmentId &&
      conversation.departmentId &&
      conversation.departmentId !== user.departmentId
    ) {
      throw new WhatsAppError('You do not have access to send messages in this department', 403, 'FORBIDDEN');
    }

    // 2. 24-Hour Customer Service Window Enforcement
    const isWindowOpen = this.isWithinCustomerServiceWindow(conversation.lastInboundMessageAt);
    if (!isWindowOpen) {
      throw new WhatsAppPolicyWindowError(
        'Outside 24-hour customer service window. Free-form messaging disallowed; use pre-approved WhatsApp template.'
      );
    }

    // 3. Dispatch to Meta Cloud API Client
    const metaResponse = await this.client.sendTextMessage(conversation.contact.phone, text);
    const waMessageId = metaResponse.messages?.[0]?.id || `wamid.local.${Date.now()}`;

    // 4. Persist in Database
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'OUTBOUND',
        type: 'TEXT',
        text,
        senderUserId: user.id,
        waMessageId,
        status: 'SENT',
        metadata: metaResponse,
      },
      include: {
        senderUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Update conversation lastMessageAt
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    await logActivity({
      actorId: user.id,
      action: 'WHATSAPP_MESSAGE_SENT',
      entityType: 'MESSAGE',
      entityId: message.id,
      contactId: conversation.contactId,
      description: `Sent outbound WhatsApp message to ${conversation.contact.phone}`,
    });

    // 5. Emit Socket.IO event
    try {
      const io = getIO();
      io.to(`conversation:${conversation.id}`).emit('message.created', {
        conversationId: conversation.id,
        message,
      });
    } catch (err) {
      // Ignore in tests
    }

    return message;
  }

  /**
   * Outbound: Send pre-approved WhatsApp message template
   * Permitted outside 24-hour window!
   */
  async sendOutboundTemplate(conversationId, templateName, languageCode = 'en_US', components = [], user) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { contact: true },
    });

    if (!conversation) {
      throw new WhatsAppError('Conversation not found', 404, 'NOT_FOUND');
    }

    // Check department access
    if (
      user.role !== 'SUPER_ADMIN' &&
      user.role !== 'ADMIN' &&
      user.departmentId &&
      conversation.departmentId &&
      conversation.departmentId !== user.departmentId
    ) {
      throw new WhatsAppError('You do not have access to send templates in this department', 403, 'FORBIDDEN');
    }

    // Verify template existence in local database
    const template = await prisma.messageTemplate.findFirst({
      where: { name: templateName },
    });

    if (template && template.status !== 'APPROVED') {
      throw new WhatsAppTemplateValidationError(
        `Template "${templateName}" is currently in ${template.status} status and cannot be dispatched.`
      );
    }

    // Dispatch via Meta Cloud API Client
    const metaResponse = await this.client.sendTemplateMessage(
      conversation.contact.phone,
      templateName,
      languageCode,
      components
    );
    const waMessageId = metaResponse.messages?.[0]?.id || `wamid.local.${Date.now()}`;

    // Extract body preview text
    let bodyPreview = template?.body || `[WhatsApp Template: ${templateName}]`;
    if (components && components.length > 0) {
      const bodyComponent = components.find((c) => c.type === 'body');
      if (bodyComponent && bodyComponent.parameters) {
        bodyComponent.parameters.forEach((p, idx) => {
          bodyPreview = bodyPreview.replace(new RegExp(`\\{\\{${idx + 1}\\}\\}`, 'g'), p.text || '');
        });
      }
    }

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'OUTBOUND',
        type: 'TEMPLATE',
        text: bodyPreview,
        senderUserId: user.id,
        waMessageId,
        status: 'SENT',
        metadata: {
          templateName,
          languageCode,
          components,
          metaResponse,
        },
      },
      include: {
        senderUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    await logActivity({
      actorId: user.id,
      action: 'WHATSAPP_TEMPLATE_SENT',
      entityType: 'MESSAGE',
      entityId: message.id,
      contactId: conversation.contactId,
      description: `Sent WhatsApp template "${templateName}" to ${conversation.contact.phone}`,
    });

    try {
      const io = getIO();
      io.to(`conversation:${conversation.id}`).emit('message.created', {
        conversationId: conversation.id,
        message,
      });
    } catch (err) {
      // Ignore in tests
    }

    return message;
  }
}

module.exports = new WhatsAppService();

const messageRepository = require('./message.repository');
const conversationService = require('../conversations/conversation.service');
const { getPagination, formatPaginatedResponse } = require('../../utils/pagination');
const { emitToConversation, emitToDepartment } = require('../../socket');
const { logActivity } = require('../../utils/activityLogger');

class MessageService {
  async listMessages(conversationId, query = {}, user) {
    // Enforce conversation department access check
    const conv = await conversationService.getById(conversationId, user);

    const { page, limit, skip } = getPagination(query);

    const where = {
      conversationId,
      ...(query.before && { createdAt: { lt: new Date(query.before) } }),
    };

    const { total, items } = await messageRepository.findAll({
      where,
      skip,
      limit,
      orderBy: { createdAt: 'asc' }, // Chronological
    });

    return formatPaginatedResponse(items, total, page, limit);
  }

  async createMessage(conversationId, data, user) {
    const conv = await conversationService.getById(conversationId, user);

    const direction = data.direction || 'OUTBOUND';
    const isOutbound = direction === 'OUTBOUND';

    let status = 'LOCAL_SAVED';
    let waMessageId = data.waMessageId || null;
    let metadata = data.metadata || null;

    if (isOutbound && data.mode === 'LIVE') {
      const whatsAppService = require('../../integrations/whatsapp/whatsapp.service');
      const whatsAppClient = require('../../integrations/whatsapp/whatsapp.client');

      // 24-hour customer service window enforcement
      const isWindowOpen = whatsAppService.isWithinCustomerServiceWindow(conv.lastInboundMessageAt);
      if (!isWindowOpen && data.type !== 'TEMPLATE') {
        const { WhatsAppPolicyWindowError } = require('../../integrations/whatsapp/whatsapp.errors');
        throw new WhatsAppPolicyWindowError(
          'Outside 24-hour customer service window. Free-form messaging disallowed; use pre-approved WhatsApp template.'
        );
      }

      // Dispatch via Meta WhatsApp Client
      const phone = conv.contact?.phone;
      if (phone) {
        const metaRes = await whatsAppClient.sendTextMessage(phone, data.text);
        waMessageId = metaRes.messages?.[0]?.id || `wamid.local.${Date.now()}`;
        status = 'SENT';
        metadata = { ...metadata, metaResponse: metaRes };
      }
    }

    const message = await messageRepository.create({
      conversationId,
      direction,
      type: data.type || 'TEXT',
      text: data.text,
      mediaUrl: data.mediaUrl || null,
      metadata,
      waMessageId,
      status,
      senderUserId: isOutbound ? user.id : null,
    });

    // Record activity log
    await logActivity({
      actorId: user?.id,
      action: isOutbound ? 'MESSAGE_SENT' : 'MESSAGE_RECEIVED',
      entityType: 'MESSAGE',
      entityId: message.id,
      contactId: conv.contactId,
      description: isOutbound
        ? `Outbound reply sent by ${user.firstName || 'Agent'}`
        : `Customer message received`,
      metadata: { type: message.type, length: message.text?.length },
    });

    // Real-time broadcast to conversation workspace and department
    emitToConversation(conversationId, 'message:created', {
      conversationId,
      message,
    });

    emitToDepartment(conv.departmentId, 'conversation:message_preview', {
      conversationId,
      lastMessage: message,
    });

    return message;
  }
}

module.exports = new MessageService();

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

    const message = await messageRepository.create({
      conversationId,
      direction,
      type: data.type || 'TEXT',
      text: data.text,
      mediaUrl: data.mediaUrl || null,
      metadata: data.metadata || null,
      status: 'LOCAL_SAVED', // Clearly marked internal Phase 3 local message
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

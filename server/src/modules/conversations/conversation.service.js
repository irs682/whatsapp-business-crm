const conversationRepository = require('./conversation.repository');
const contactRepository = require('../contacts/contact.repository');
const noteRepository = require('../notes/note.repository');
const prisma = require('../../config/prisma');
const { ForbiddenError, NotFoundError, ConflictError, BadRequestError } = require('../../errors');
const { getPagination, formatPaginatedResponse } = require('../../utils/pagination');
const { logActivity } = require('../../utils/activityLogger');
const { ALLOWED_STATUS_TRANSITIONS } = require('./conversation.constants');
const {
  emitToConversation,
  emitToDepartment,
  emitToUser,
} = require('../../socket');

class ConversationService {
  async list(query = {}, user) {
    const { page, limit, skip, orderBy } = getPagination(query);
    const isPrivileged = user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN');
    const userDeptIds = (user?.departments || []).map((d) => d.id);

    const where = {
      deletedAt: null,
      ...(query.status && { status: query.status }),
      ...(query.priority && { priority: query.priority }),
      ...(query.contactId && { contactId: query.contactId }),
      ...(query.assignedToUserId && { assignedToUserId: query.assignedToUserId }),
      ...(query.search && {
        OR: [
          { contact: { firstName: { contains: query.search, mode: 'insensitive' } } },
          { contact: { lastName: { contains: query.search, mode: 'insensitive' } } },
          { contact: { phone: { contains: query.search, mode: 'insensitive' } } },
          { contact: { company: { contains: query.search, mode: 'insensitive' } } },
        ],
      }),
    };

    // Filter scopes
    if (query.scope === 'mine') {
      where.assignedToUserId = user.id;
    } else if (query.scope === 'unassigned') {
      where.assignedToUserId = null;
    } else if (query.scope === 'unread') {
      where.unreadCount = { gt: 0 };
    } else if (query.scope === 'high_priority') {
      where.priority = { in: ['HIGH', 'URGENT'] };
    }

    // Department isolation: Non-privileged users only see conversations in their authorized departments or assigned to them
    if (!isPrivileged) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { departmentId: { in: userDeptIds } },
            { assignedToUserId: user?.id },
            { departmentId: null }, // Fallback unmatched queue
          ],
        },
      ];
    } else if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    const { total, items } = await conversationRepository.findAll({ skip, limit, orderBy, where });
    return formatPaginatedResponse(items, total, page, limit);
  }

  async getById(id, user) {
    const conversation = await conversationRepository.findById(id);
    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    const isPrivileged = user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN');
    if (!isPrivileged) {
      const userDeptIds = (user?.departments || []).map((d) => d.id);
      const isAssigned = conversation.assignedToUserId === user?.id;
      const isAuthorizedDept = !conversation.departmentId || userDeptIds.includes(conversation.departmentId);

      if (!isAssigned && !isAuthorizedDept) {
        throw new ForbiddenError('You do not have access to conversations belonging to unauthorized departments');
      }
    }

    return conversation;
  }

  async create(data, user) {
    const contact = await contactRepository.findById(data.contactId);
    if (!contact) {
      throw new NotFoundError('Associated contact was not found');
    }

    const departmentId = data.departmentId || contact.departmentId || null;
    const assignedUserId = data.assignedToUserId || null;

    const conversation = await conversationRepository.create({
      contactId: contact.id,
      departmentId,
      assignedToUserId: assignedUserId,
      priority: data.priority || 'NORMAL',
      status: data.status || 'OPEN',
      channel: data.channel || 'WHATSAPP',
      lastMessageAt: new Date(),
    });

    await logActivity({
      actorId: user?.id,
      action: 'CONVERSATION_CREATED',
      entityType: 'CONVERSATION',
      entityId: conversation.id,
      contactId: contact.id,
      description: `Conversation initiated with ${contact.firstName || 'Customer'} (${contact.phone})`,
    });

    // Real-time broadcast
    emitToDepartment(departmentId, 'conversation:created', conversation);

    return conversation;
  }

  async updateStatus(id, newStatus, user) {
    const conv = await this.getById(id, user);

    if (conv.status === newStatus) {
      return conv;
    }

    // Validate transition
    const allowed = ALLOWED_STATUS_TRANSITIONS[conv.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestError(`Cannot transition conversation status from ${conv.status} to ${newStatus}`);
    }

    const updateData = { status: newStatus };
    if (newStatus === 'RESOLVED') {
      updateData.resolvedAt = new Date();
    } else if (newStatus === 'CLOSED') {
      updateData.closedAt = new Date();
    } else if (newStatus === 'OPEN') {
      updateData.resolvedAt = null;
      updateData.closedAt = null;
    }

    const updated = await conversationRepository.update(id, updateData);

    await logActivity({
      actorId: user.id,
      action: 'CONVERSATION_STATUS_CHANGED',
      entityType: 'CONVERSATION',
      entityId: id,
      contactId: conv.contactId,
      description: `Conversation status changed from ${conv.status} to ${newStatus}`,
      metadata: { from: conv.status, to: newStatus },
    });

    // Real-time notifications
    emitToConversation(id, 'conversation:status_changed', { conversationId: id, status: newStatus });
    emitToDepartment(conv.departmentId, 'conversation:updated', updated);

    return updated;
  }

  async updatePriority(id, newPriority, user) {
    const conv = await this.getById(id, user);
    const updated = await conversationRepository.update(id, { priority: newPriority });

    await logActivity({
      actorId: user.id,
      action: 'CONVERSATION_PRIORITY_CHANGED',
      entityType: 'CONVERSATION',
      entityId: id,
      contactId: conv.contactId,
      description: `Conversation priority set to ${newPriority}`,
      metadata: { from: conv.priority, to: newPriority },
    });

    emitToConversation(id, 'conversation:priority_changed', { conversationId: id, priority: newPriority });
    emitToDepartment(conv.departmentId, 'conversation:updated', updated);

    return updated;
  }

  async claim(id, user) {
    const conv = await this.getById(id, user);

    if (conv.assignedToUserId) {
      if (conv.assignedToUserId === user.id) {
        return conv;
      }
      throw new ConflictError('Conversation is already assigned to another agent');
    }

    const result = await conversationRepository.claimAtomic(id, user.id);
    if (!result || result.conflict) {
      throw new ConflictError('Conversation was just claimed by another agent');
    }

    await logActivity({
      actorId: user.id,
      action: 'CONVERSATION_CLAIMED',
      entityType: 'CONVERSATION',
      entityId: id,
      contactId: conv.contactId,
      description: `Conversation claimed by ${user.firstName} ${user.lastName}`,
    });

    emitToConversation(id, 'conversation:assigned', {
      conversationId: id,
      assignedToUser: result.conversation.assignedToUser,
      assignedBy: user,
    });
    emitToDepartment(conv.departmentId, 'conversation:updated', result.conversation);

    return result.conversation;
  }

  async assign(id, targetUserId, user) {
    const conv = await this.getById(id, user);

    if (targetUserId === null) {
      // Unassigning
      const updated = await conversationRepository.update(id, { assignedToUserId: null });
      emitToConversation(id, 'conversation:assigned', { conversationId: id, assignedToUser: null });
      emitToDepartment(conv.departmentId, 'conversation:updated', updated);
      return updated;
    }

    // Verify target user is active
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { departments: true },
    });

    if (!targetUser || targetUser.status !== 'ACTIVE' || targetUser.deletedAt) {
      throw new BadRequestError('Target user is not an active staff member');
    }

    // Verify target user has access to conversation department
    if (conv.departmentId) {
      const targetDeptIds = targetUser.departments.map((d) => d.departmentId);
      const isPrivileged = targetUser.roleId; // Can check role if needed
      // If target user isn't admin and doesn't belong to dept
      const targetUserDepts = await prisma.userDepartment.findMany({ where: { userId: targetUserId } });
      const inDept = targetUserDepts.some((d) => d.departmentId === conv.departmentId);
      if (!inDept) {
        const roles = await prisma.role.findMany();
        const targetRole = roles.find((r) => r.id === targetUser.roleId);
        if (targetRole?.name !== 'SUPER_ADMIN' && targetRole?.name !== 'ADMIN') {
          throw new ForbiddenError('Target agent does not belong to the conversation department');
        }
      }
    }

    const updated = await conversationRepository.update(id, { assignedToUserId: targetUserId });

    await logActivity({
      actorId: user.id,
      action: 'CONVERSATION_ASSIGNED',
      entityType: 'CONVERSATION',
      entityId: id,
      contactId: conv.contactId,
      description: `Conversation assigned to ${targetUser.firstName} ${targetUser.lastName}`,
      metadata: { targetUserId },
    });

    emitToConversation(id, 'conversation:assigned', {
      conversationId: id,
      assignedToUser: updated.assignedToUser,
      assignedBy: user,
    });
    emitToUser(targetUserId, 'conversation:assigned_to_me', updated);
    emitToDepartment(conv.departmentId, 'conversation:updated', updated);

    return updated;
  }

  async transfer(id, transferData, user) {
    const conv = await this.getById(id, user);

    const { toDepartmentId, reason, handoverSummary, assignedToUserId } = transferData;

    if (conv.departmentId === toDepartmentId) {
      throw new BadRequestError('Conversation is already in the target department');
    }

    const targetDept = await prisma.department.findUnique({
      where: { id: toDepartmentId },
    });

    if (!targetDept || !targetDept.isActive || targetDept.deletedAt) {
      throw new NotFoundError('Target department not found or is currently inactive');
    }

    // Save handover note if provided
    if (handoverSummary && handoverSummary.trim()) {
      await noteRepository.create({
        content: `[HANDOVER SUMMARY]: ${handoverSummary.trim()}${reason ? ` (Reason: ${reason})` : ''}`,
        conversationId: id,
        contactId: conv.contactId,
        authorId: user.id,
        isInternal: true,
      });
    }

    const { transfer, conversation: updatedConv } = await conversationRepository.createTransfer({
      conversationId: id,
      fromDepartmentId: conv.departmentId,
      toDepartmentId,
      transferredById: user.id,
      reason: reason || null,
      handoverSummary: handoverSummary || null,
      assignedToUserId: assignedToUserId || null,
    });

    await logActivity({
      actorId: user.id,
      action: 'CONVERSATION_TRANSFERRED',
      entityType: 'CONVERSATION',
      entityId: id,
      contactId: conv.contactId,
      description: `Conversation transferred to ${targetDept.name} by ${user.firstName}`,
      metadata: { fromDepartmentId: conv.departmentId, toDepartmentId, reason },
    });

    // Real-time broadcasts:
    // 1. Notify conversation room
    emitToConversation(id, 'conversation:transferred', {
      conversationId: id,
      fromDepartmentId: conv.departmentId,
      toDepartmentId,
      handoverSummary,
    });
    // 2. Notify old department queue that chat moved out
    emitToDepartment(conv.departmentId, 'conversation:transferred_out', { conversationId: id });
    // 3. Notify new department queue that chat arrived
    emitToDepartment(toDepartmentId, 'conversation:created', updatedConv);

    return { transfer, conversation: updatedConv };
  }

  async markAsRead(id, user) {
    await this.getById(id, user);
    await conversationRepository.markAsRead(id, user.id);

    emitToConversation(id, 'conversation:read', { conversationId: id, userId: user.id });
    return { id, unreadCount: 0, success: true };
  }
}

module.exports = new ConversationService();

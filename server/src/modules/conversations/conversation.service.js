const conversationRepository = require('./conversation.repository');

const { ForbiddenError, NotFoundError } = require('../../errors');
const { getPagination, formatPaginatedResponse } = require('../../utils/pagination');

class ConversationService {
  async list(query = {}, user) {
    const { page, limit, skip, orderBy } = getPagination(query);
    const isPrivileged = user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN');
    const userDeptIds = (user?.departments || []).map((d) => d.id);

    const where = {
      deletedAt: null,
      ...(query.status && { status: query.status }),
      ...(query.contactId && { contactId: query.contactId }),
    };

    // Department isolation: Non-admin users can ONLY see conversations in their authorized departments or assigned to them
    if (!isPrivileged) {
      where.OR = [
        { departmentId: { in: userDeptIds } },
        { assignedToUserId: user?.id },
        { departmentId: null },
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
}

module.exports = new ConversationService();

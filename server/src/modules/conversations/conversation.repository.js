const prisma = require('../../config/prisma');

class ConversationRepository {
  async findAll({ where = {}, skip = 0, limit = 25, orderBy = { lastMessageAt: 'desc' } } = {}) {
    const [total, items] = await Promise.all([
      prisma.conversation.count({ where }),
      prisma.conversation.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              waId: true,
              company: true,
              avatarUrl: true,
              tags: true,
            },
          },
          department: {
            select: { id: true, name: true },
          },
          assignedToUser: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              text: true,
              type: true,
              direction: true,
              createdAt: true,
              status: true,
            },
          },
        },
      }),
    ]);
    return { total, items };
  }

  async findById(id) {
    return prisma.conversation.findFirst({
      where: { id, deletedAt: null },
      include: {
        contact: {
          include: {
            contactTags: { include: { tag: true } },
            leads: { where: { deletedAt: null }, take: 5 },
            tasks: { where: { deletedAt: null }, take: 5 },
          },
        },
        department: true,
        assignedToUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        transfers: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            fromDepartment: { select: { id: true, name: true } },
            toDepartment: { select: { id: true, name: true } },
            transferredBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  async findByContactId(contactId) {
    return prisma.conversation.findFirst({
      where: { contactId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async create(data) {
    return prisma.conversation.create({
      data,
      include: {
        contact: true,
        department: true,
        assignedToUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async update(id, data) {
    return prisma.conversation.update({
      where: { id },
      data,
      include: {
        contact: true,
        department: true,
        assignedToUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  // Atomic claim to prevent race conditions when two agents claim concurrently
  async claimAtomic(id, userId) {
    return prisma.$transaction(async (tx) => {
      const conv = await tx.conversation.findUnique({
        where: { id },
        select: { id: true, assignedToUserId: true, departmentId: true },
      });

      if (!conv) return null;
      if (conv.assignedToUserId !== null) {
        // Already claimed by another agent
        return { conflict: true, currentAssignee: conv.assignedToUserId };
      }

      const updated = await tx.conversation.update({
        where: { id },
        data: { assignedToUserId: userId },
        include: {
          assignedToUser: { select: { id: true, firstName: true, lastName: true } },
          department: true,
          contact: true,
        },
      });

      return { success: true, conversation: updated };
    });
  }

  async createTransfer(transferData) {
    const { assignedToUserId, ...transferRecordData } = transferData;

    return prisma.$transaction(async (tx) => {
      const transfer = await tx.conversationTransfer.create({
        data: transferRecordData,
        include: {
          fromDepartment: { select: { id: true, name: true } },
          toDepartment: { select: { id: true, name: true } },
          transferredBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      const updatedConv = await tx.conversation.update({
        where: { id: transferData.conversationId },
        data: {
          departmentId: transferData.toDepartmentId,
          assignedToUserId: assignedToUserId || null, // Clear or reassign
        },
        include: {
          department: true,
          assignedToUser: { select: { id: true, firstName: true, lastName: true } },
          contact: true,
        },
      });

      return { transfer, conversation: updatedConv };
    });
  }

  async markAsRead(conversationId, userId) {
    return prisma.$transaction(async (tx) => {
      await tx.conversationReadState.upsert({
        where: { conversationId_userId: { conversationId, userId } },
        update: { lastReadAt: new Date() },
        create: { conversationId, userId, lastReadAt: new Date() },
      });

      return tx.conversation.update({
        where: { id: conversationId },
        data: { unreadCount: 0 },
      });
    });
  }
}

module.exports = new ConversationRepository();

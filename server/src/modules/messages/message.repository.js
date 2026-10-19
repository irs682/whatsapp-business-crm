const prisma = require('../../config/prisma');

class MessageRepository {
  async findAll({ where = {}, skip = 0, limit = 50, orderBy = { createdAt: 'asc' } } = {}) {
    const [total, items] = await Promise.all([
      prisma.message.count({ where }),
      prisma.message.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          senderUser: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
        },
      }),
    ]);
    return { total, items };
  }

  async findById(id) {
    return prisma.message.findUnique({
      where: { id },
      include: {
        senderUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        conversation: true,
      },
    });
  }

  async create(data) {
    return prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data,
        include: {
          senderUser: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
        },
      });

      // Update conversation lastMessageAt and unreadCount if inbound
      const updateData = { lastMessageAt: message.createdAt };
      if (message.direction === 'INBOUND') {
        updateData.lastInboundMessageAt = message.createdAt;
        updateData.unreadCount = { increment: 1 };
      }

      await tx.conversation.update({
        where: { id: data.conversationId },
        data: updateData,
      });

      return message;
    });
  }
}

module.exports = new MessageRepository();

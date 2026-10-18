const prisma = require('../../config/prisma');

class ConversationRepository {
  async findAll({ where = {}, skip, limit, orderBy } = {}) {
    const [total, items] = await Promise.all([
      prisma.conversation.count({ where }),
      prisma.conversation.findMany({
        where,
        skip,
        take: limit,
        orderBy: orderBy || { updatedAt: 'desc' },
        include: {
          contact: {
            select: { id: true, firstName: true, lastName: true, phone: true, waId: true },
          },
          department: {
            select: { id: true, name: true },
          },
          assignedToUser: {
            select: { id: true, firstName: true, lastName: true },
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
        contact: true,
        department: true,
        assignedToUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
    });
  }
}

module.exports = new ConversationRepository();

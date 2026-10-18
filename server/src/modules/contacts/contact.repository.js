const prisma = require('../../config/prisma');

class ContactRepository {
  async findAll({ skip, limit, orderBy, where }) {
    const [total, items] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          _count: {
            select: {
              conversations: true,
              leads: true,
              notes: true,
              tasks: true,
            },
          },
        },
      }),
    ]);

    return { total, items };
  }

  async findById(id) {
    return prisma.contact.findFirst({
      where: { id, deletedAt: null },
      include: {
        conversations: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        leads: {
          orderBy: { createdAt: 'desc' },
        },
        notes: {
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        tasks: {
          orderBy: { dueDate: 'asc' },
        },
        consents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findByPhone(phone) {
    return prisma.contact.findFirst({
      where: { phone, deletedAt: null },
    });
  }

  async findByWaId(waId) {
    return prisma.contact.findFirst({
      where: { waId, deletedAt: null },
    });
  }

  async create(data) {
    return prisma.contact.create({
      data,
    });
  }

  async update(id, data) {
    return prisma.contact.update({
      where: { id },
      data,
    });
  }

  async softDelete(id) {
    return prisma.contact.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}

module.exports = new ContactRepository();

const prisma = require('../../config/prisma');

class LeadRepository {
  async findAll({ skip, limit, orderBy, where }) {
    const [total, items] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
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
              email: true,
            },
          },
          assignedToUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    return { total, items };
  }

  async findById(id) {
    return prisma.lead.findFirst({
      where: { id, deletedAt: null },
      include: {
        contact: true,
        assignedToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        department: true,
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
      },
    });
  }

  async create(data) {
    return prisma.lead.create({
      data,
      include: {
        contact: true,
        assignedToUser: true,
        department: true,
      },
    });
  }

  async update(id, data) {
    return prisma.lead.update({
      where: { id },
      data,
      include: {
        contact: true,
        assignedToUser: true,
        department: true,
      },
    });
  }

  async softDelete(id) {
    return prisma.lead.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}

module.exports = new LeadRepository();

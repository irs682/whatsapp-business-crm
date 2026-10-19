const prisma = require('../../config/prisma');

class TaskRepository {
  async findAll({ skip = 0, limit = 20, where = {}, orderBy = { createdAt: 'desc' } }) {
    const [total, items] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        skip,
        take: limit,
        where,
        orderBy,
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          assignedToUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
            },
          },
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              company: true,
            },
          },
          lead: {
            select: {
              id: true,
              title: true,
              stage: true,
            },
          },
        },
      }),
    ]);
    return { total, items };
  }

  async findById(id) {
    return prisma.task.findFirst({
      where: { id, deletedAt: null },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assignedToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        contact: true,
        lead: true,
      },
    });
  }

  async create(data) {
    return prisma.task.create({
      data,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assignedToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        contact: true,
        lead: true,
      },
    });
  }

  async update(id, data) {
    return prisma.task.update({
      where: { id },
      data,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assignedToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        contact: true,
        lead: true,
      },
    });
  }

  async softDelete(id) {
    return prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async count(where) {
    return prisma.task.count({ where });
  }
}

module.exports = new TaskRepository();

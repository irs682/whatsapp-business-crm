const prisma = require('../../config/prisma');

class NoteRepository {
  async findAll({ skip = 0, limit = 20, where = {}, orderBy = { createdAt: 'desc' } }) {
    const [total, items] = await Promise.all([
      prisma.note.count({ where }),
      prisma.note.findMany({
        skip,
        take: limit,
        where,
        orderBy,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      }),
    ]);
    return { total, items };
  }

  async findById(id) {
    return prisma.note.findFirst({
      where: { id, deletedAt: null },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        contact: true,
        lead: true,
      },
    });
  }

  async create(data) {
    return prisma.note.create({
      data,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async softDelete(id) {
    return prisma.note.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

module.exports = new NoteRepository();

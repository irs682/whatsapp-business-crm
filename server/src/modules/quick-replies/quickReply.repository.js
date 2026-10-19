const prisma = require('../../config/prisma');

class QuickReplyRepository {
  async findAll({ where = {}, orderBy = { createdAt: 'desc' } } = {}) {
    return prisma.quickReply.findMany({
      where,
      orderBy,
      include: {
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findById(id) {
    return prisma.quickReply.findUnique({
      where: { id },
      include: {
        department: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findByShortcut(shortcut) {
    return prisma.quickReply.findUnique({
      where: { shortcut },
    });
  }

  async create(data) {
    return prisma.quickReply.create({
      data,
      include: {
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async update(id, data) {
    return prisma.quickReply.update({
      where: { id },
      data,
      include: {
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async delete(id) {
    return prisma.quickReply.delete({
      where: { id },
    });
  }
}

module.exports = new QuickReplyRepository();

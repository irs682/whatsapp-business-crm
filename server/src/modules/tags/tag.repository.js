const prisma = require('../../config/prisma');

class TagRepository {
  async findAll({ where = {}, orderBy = { name: 'asc' } } = {}) {
    return prisma.tag.findMany({
      where,
      orderBy,
      include: {
        _count: {
          select: {
            contacts: true,
          },
        },
      },
    });
  }

  async findById(id) {
    return prisma.tag.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            contacts: true,
          },
        },
      },
    });
  }

  async findByName(name) {
    return prisma.tag.findUnique({
      where: { name },
    });
  }

  async create(data) {
    return prisma.tag.create({
      data,
    });
  }

  async update(id, data) {
    return prisma.tag.update({
      where: { id },
      data,
    });
  }

  async delete(id) {
    return prisma.tag.delete({
      where: { id },
    });
  }
}

module.exports = new TagRepository();

const prisma = require('../../config/prisma');

class DepartmentRepository {
  async findAll({ where = {}, orderBy = { name: 'asc' } } = {}) {
    return prisma.department.findMany({
      where: {
        ...where,
        deletedAt: null,
      },
      orderBy,
      include: {
        _count: {
          select: {
            users: true,
            conversations: true,
          },
        },
      },
    });
  }

  async findById(id) {
    return prisma.department.findFirst({
      where: { id, deletedAt: null },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: {
            conversations: true,
            leads: true,
          },
        },
      },
    });
  }

  async findByName(name) {
    return prisma.department.findUnique({
      where: { name },
    });
  }

  async create(data) {
    return prisma.department.create({
      data,
    });
  }

  async update(id, data) {
    return prisma.department.update({
      where: { id },
      data,
    });
  }

  async softDelete(id) {
    return prisma.department.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }
}

module.exports = new DepartmentRepository();

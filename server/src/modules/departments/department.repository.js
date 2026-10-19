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
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            users: true,
            conversations: true,
            leads: true,
            contacts: true,
          },
        },
      },
    });
  }

  async findById(id) {
    return prisma.department.findFirst({
      where: { id, deletedAt: null },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        users: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                status: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: {
            conversations: true,
            leads: true,
            contacts: true,
          },
        },
      },
    });
  }

  async findByName(name) {
    return prisma.department.findFirst({
      where: { name, deletedAt: null },
    });
  }

  async getDepartmentUsers(departmentId) {
    return prisma.userDepartment.findMany({
      where: { departmentId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            status: true,
            role: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async assignUser(departmentId, userId, isPrimary = false) {
    return prisma.userDepartment.upsert({
      where: { userId_departmentId: { userId, departmentId } },
      update: { isPrimary },
      create: { departmentId, userId, isPrimary },
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
    });
  }

  async removeUser(departmentId, userId) {
    return prisma.userDepartment.delete({
      where: { userId_departmentId: { userId, departmentId } },
    });
  }

  async countActiveDependents(id) {
    const [openConversations, activeLeads] = await Promise.all([
      prisma.conversation.count({
        where: {
          departmentId: id,
          status: { in: ['OPEN', 'PENDING'] },
          deletedAt: null,
        },
      }),
      prisma.lead.count({
        where: {
          departmentId: id,
          deletedAt: null,
        },
      }),
    ]);

    return { openConversations, activeLeads, total: openConversations + activeLeads };
  }

  async create(data) {
    return prisma.department.create({
      data,
      include: {
        manager: true,
      },
    });
  }

  async update(id, data) {
    return prisma.department.update({
      where: { id },
      data,
      include: {
        manager: true,
      },
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

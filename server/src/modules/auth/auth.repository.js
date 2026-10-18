const prisma = require('../../config/prisma');

class AuthRepository {
  async findUserByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        departments: {
          include: {
            department: true,
          },
        },
      },
    });
  }

  async findUserById(id) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        departments: {
          include: {
            department: true,
          },
        },
      },
    });
  }

  async findRoleByName(name) {
    return prisma.role.findUnique({
      where: { name },
    });
  }

  async createUser(data) {
    return prisma.user.create({
      data,
      include: {
        role: true,
      },
    });
  }
}

module.exports = new AuthRepository();

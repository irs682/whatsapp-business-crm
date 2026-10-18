const prisma = require('../../config/prisma');

class UserRepository {
  async findAll({ skip, limit, orderBy, where }) {
    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatarUrl: true,
          status: true,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
          departments: {
            select: {
              department: {
                select: {
                  id: true,
                  name: true,
                },
              },
              isPrimary: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return { total, items };
  }

  async findById(id) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        status: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        departments: {
          select: {
            department: {
              select: {
                id: true,
                name: true,
              },
            },
            isPrimary: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async create(data, departmentIds = []) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data,
      });

      if (departmentIds.length > 0) {
        await tx.userDepartment.createMany({
          data: departmentIds.map((deptId, index) => ({
            userId: user.id,
            departmentId: deptId,
            isPrimary: index === 0,
          })),
        });
      }

      return user;
    });
  }

  async update(id, data, departmentIds) {
    return prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id },
        data,
      });

      if (departmentIds) {
        // Replace existing department assignments
        await tx.userDepartment.deleteMany({
          where: { userId: id },
        });

        if (departmentIds.length > 0) {
          await tx.userDepartment.createMany({
            data: departmentIds.map((deptId, index) => ({
              userId: id,
              departmentId: deptId,
              isPrimary: index === 0,
            })),
          });
        }
      }

      return updatedUser;
    });
  }

  async softDelete(id) {
    return prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'INACTIVE',
      },
    });
  }
}

module.exports = new UserRepository();

const { UnauthorizedError, ForbiddenError } = require('../errors');
const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/prisma');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token missing or invalid format');
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired authentication token');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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

    if (!user || user.deletedAt) {
      throw new UnauthorizedError('User account not found or has been removed');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenError(`User account is currently ${user.status.toLowerCase()}`);
    }

    // Flatten permissions list for rapid checks
    const permissions = user.role.rolePermissions.map((rp) => rp.permission.slug);

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role.name,
      roleId: user.roleId,
      permissions,
      departments: user.departments.map((ud) => ({
        id: ud.department.id,
        name: ud.department.name,
        isPrimary: ud.isPrimary,
      })),
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticate;

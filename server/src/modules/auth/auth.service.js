const authRepository = require('./auth.repository');
const { ConflictError, UnauthorizedError, BadRequestError } = require('../../errors');
const { hashPassword, comparePassword } = require('../../utils/password');
const { generateToken } = require('../../utils/jwt');

class AuthService {
  async register(data) {
    const existing = await authRepository.findUserByEmail(data.email);
    if (existing) {
      throw new ConflictError('A user with this email already exists');
    }

    const { ForbiddenError } = require('../../errors');
    if (data.roleName && data.roleName !== 'AGENT') {
      throw new ForbiddenError('Public self-registration cannot create privileged administrative accounts');
    }

    const role = await authRepository.findRoleByName('AGENT');
    if (!role) {
      throw new BadRequestError('Default agent role is not configured');
    }

    const passwordHash = await hashPassword(data.password);

    const user = await authRepository.createUser({
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone || null,
      roleId: role.id,
      status: 'ACTIVE',
    });

    const token = generateToken({
      userId: user.id,
      role: role.name,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: role.name,
      },
      token,
    };
  }

  async login(email, password) {
    const user = await authRepository.findUserByEmail(email);
    if (!user || user.deletedAt) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError(`Account is ${user.status.toLowerCase()}. Please contact admin.`);
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = generateToken({
      userId: user.id,
      role: user.role.name,
    });

    const permissions = user.role.rolePermissions.map((rp) => rp.permission.slug);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role.name,
        permissions,
        departments: user.departments.map((ud) => ({
          id: ud.department.id,
          name: ud.department.name,
          isPrimary: ud.isPrimary,
        })),
      },
      token,
    };
  }

  async getCurrentUser(userId) {
    const user = await authRepository.findUserById(userId);
    if (!user || user.deletedAt) {
      throw new UnauthorizedError('User not found');
    }

    const permissions = user.role.rolePermissions.map((rp) => rp.permission.slug);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role.name,
      permissions,
      departments: user.departments.map((ud) => ({
        id: ud.department.id,
        name: ud.department.name,
        isPrimary: ud.isPrimary,
      })),
      createdAt: user.createdAt,
    };
  }
}

module.exports = new AuthService();

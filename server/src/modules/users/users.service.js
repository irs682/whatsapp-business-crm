const userRepository = require('./users.repository');
const { ConflictError, NotFoundError, ForbiddenError, BadRequestError } = require('../../errors');
const { hashPassword } = require('../../utils/password');
const { getPagination, formatPaginatedResponse } = require('../../utils/pagination');

const ROLE_HIERARCHY = {
  SUPER_ADMIN: 4,
  ADMIN: 3,
  MANAGER: 2,
  AGENT: 1,
};

class UserService {
  async listUsers(query, caller) {
    const { page, limit, skip, orderBy } = getPagination(query);

    const where = {
      deletedAt: null,
      ...(query.status && { status: query.status }),
      ...(query.role && { role: { name: query.role } }),
      ...(query.departmentId && {
        departments: {
          some: { departmentId: query.departmentId },
        },
      }),
      ...(query.search && {
        OR: [
          { email: { contains: query.search, mode: 'insensitive' } },
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    // Department managers only see users belonging to their own departments
    if (caller && caller.role === 'MANAGER') {
      const callerDeptIds = (caller.departments || []).map((d) => d.id);
      where.departments = {
        some: { departmentId: { in: callerDeptIds } },
      };
    }

    const { total, items } = await userRepository.findAll({ skip, limit, orderBy, where });
    return formatPaginatedResponse(items, total, page, limit);
  }

  async getUserById(id, caller) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (caller && caller.role === 'MANAGER') {
      const callerDeptIds = (caller.departments || []).map((d) => d.id);
      const userDeptIds = (user.departments || []).map((d) => d.department.id);
      const hasSharedDept = userDeptIds.some((id) => callerDeptIds.includes(id));
      if (!hasSharedDept && user.id !== caller.id) {
        throw new ForbiddenError('You can only view users within your authorized departments');
      }
    }

    return user;
  }

  async createUser(payload, caller) {
    const existing = await userRepository.findByEmail(payload.email);
    if (existing) {
      throw new ConflictError('A user with this email address already exists');
    }

    // Resolve Role
    let role;
    if (payload.roleId) {
      role = await userRepository.findRoleById(payload.roleId);
    } else if (payload.roleName) {
      role = await userRepository.findRoleByName(payload.roleName);
    } else {
      role = await userRepository.findRoleByName('AGENT');
    }

    if (!role) {
      throw new BadRequestError('Invalid role specified');
    }

    // Role Hierarchy check: Caller cannot create a role with equal or higher rank unless SUPER_ADMIN
    if (caller) {
      const callerRank = ROLE_HIERARCHY[caller.role] || 0;
      const targetRank = ROLE_HIERARCHY[role.name] || 0;
      if (caller.role !== 'SUPER_ADMIN' && targetRank >= callerRank) {
        throw new ForbiddenError(`You cannot create a user with role ${role.name}`);
      }
    }

    const passwordHash = await hashPassword(payload.password);
    const { departmentIds, roleId, roleName, password, ...rest } = payload;

    const user = await userRepository.create(
      {
        ...rest,
        roleId: role.id,
        passwordHash,
      },
      departmentIds || []
    );

    return this.getUserById(user.id, caller);
  }

  async updateUser(id, payload, caller) {
    const targetUser = await this.getUserById(id, caller);

    // If changing role, verify caller hierarchy
    let roleId = payload.roleId;
    if (payload.roleName) {
      const role = await userRepository.findRoleByName(payload.roleName);
      if (!role) throw new BadRequestError('Invalid role specified');
      roleId = role.id;
    }

    if (roleId && roleId !== targetUser.roleId) {
      const targetRole = await userRepository.findRoleById(roleId);
      const callerRank = ROLE_HIERARCHY[caller?.role] || 0;
      const newRank = ROLE_HIERARCHY[targetRole?.name] || 0;
      const currentRank = ROLE_HIERARCHY[targetUser.role?.name] || 0;

      if (caller?.role !== 'SUPER_ADMIN') {
        if (newRank >= callerRank || currentRank >= callerRank) {
          throw new ForbiddenError('You cannot elevate or modify roles at or above your own authority');
        }
      }

      // If demoting a SUPER_ADMIN, ensure there is at least one other active SUPER_ADMIN
      if (targetUser.role?.name === 'SUPER_ADMIN' && targetRole?.name !== 'SUPER_ADMIN') {
        const activeCount = await userRepository.countActiveSuperAdmins();
        if (activeCount <= 1) {
          throw new BadRequestError('Cannot demote the last active SUPER_ADMIN in the system');
        }
      }
    }

    const { departmentIds, roleName, ...userData } = payload;
    if (roleId) {
      userData.roleId = roleId;
    }

    await userRepository.update(id, userData, departmentIds);
    return this.getUserById(id, caller);
  }

  async updateUserStatus(id, status, caller) {
    const targetUser = await this.getUserById(id, caller);

    if (targetUser.role?.name === 'SUPER_ADMIN' && (status === 'INACTIVE' || status === 'SUSPENDED')) {
      const activeCount = await userRepository.countActiveSuperAdmins();
      if (activeCount <= 1) {
        throw new BadRequestError('Cannot deactivate or suspend the last active SUPER_ADMIN');
      }
    }

    await userRepository.updateStatus(id, status);
    return this.getUserById(id, caller);
  }

  async updateUserDepartments(id, departmentIds, caller) {
    await this.getUserById(id, caller);
    await userRepository.update(id, {}, departmentIds);
    return this.getUserById(id, caller);
  }

  async deleteUser(id, caller) {
    const targetUser = await this.getUserById(id, caller);

    if (targetUser.role?.name === 'SUPER_ADMIN') {
      const activeCount = await userRepository.countActiveSuperAdmins();
      if (activeCount <= 1) {
        throw new BadRequestError('Cannot delete the last active SUPER_ADMIN in the system');
      }
    }

    if (caller && caller.id === id) {
      throw new BadRequestError('You cannot delete your own user account');
    }

    await userRepository.softDelete(id);
    return { id, deleted: true };
  }
}

module.exports = new UserService();

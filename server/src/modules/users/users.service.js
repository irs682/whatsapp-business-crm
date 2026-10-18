const userRepository = require('./users.repository');
const { ConflictError, NotFoundError } = require('../../errors');
const { hashPassword } = require('../../utils/password');
const { getPagination, formatPaginatedResponse } = require('../../utils/pagination');

class UserService {
  async listUsers(query) {
    const { page, limit, skip, orderBy } = getPagination(query);

    const where = {
      deletedAt: null,
      ...(query.status && { status: query.status }),
      ...(query.role && { role: { name: query.role } }),
      ...(query.search && {
        OR: [
          { email: { contains: query.search, mode: 'insensitive' } },
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const { total, items } = await userRepository.findAll({ skip, limit, orderBy, where });
    return formatPaginatedResponse(items, total, page, limit);
  }

  async getUserById(id) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  async createUser(payload) {
    const existing = await userRepository.findByEmail(payload.email);
    if (existing) {
      throw new ConflictError('A user with this email address already exists');
    }

    const passwordHash = await hashPassword(payload.password);
    const { departmentIds, password, ...rest } = payload;

    const user = await userRepository.create(
      {
        ...rest,
        passwordHash,
      },
      departmentIds
    );

    return this.getUserById(user.id);
  }

  async updateUser(id, payload) {
    await this.getUserById(id);

    const { departmentIds, ...userData } = payload;
    await userRepository.update(id, userData, departmentIds);

    return this.getUserById(id);
  }

  async deleteUser(id) {
    await this.getUserById(id);
    await userRepository.softDelete(id);
    return { id, deleted: true };
  }
}

module.exports = new UserService();

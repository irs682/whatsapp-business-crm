const departmentRepository = require('./department.repository');
const userRepository = require('../users/users.repository');
const { ConflictError, NotFoundError, BadRequestError } = require('../../errors');

class DepartmentService {
  async listDepartments(query = {}) {
    const where = {};
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }

    const items = await departmentRepository.findAll({ where });
    return items;
  }

  async getDepartmentById(id) {
    const department = await departmentRepository.findById(id);
    if (!department) {
      throw new NotFoundError('Department not found');
    }
    return department;
  }

  async createDepartment(data) {
    const existing = await departmentRepository.findByName(data.name);
    if (existing) {
      throw new ConflictError('A department with this name already exists');
    }

    if (data.managerId) {
      const manager = await userRepository.findById(data.managerId);
      if (!manager) {
        throw new BadRequestError('Specified department manager does not exist');
      }
    }

    return departmentRepository.create(data);
  }

  async updateDepartment(id, data) {
    await this.getDepartmentById(id);

    if (data.name) {
      const existing = await departmentRepository.findByName(data.name);
      if (existing && existing.id !== id) {
        throw new ConflictError('A department with this name already exists');
      }
    }

    if (data.managerId) {
      const manager = await userRepository.findById(data.managerId);
      if (!manager) {
        throw new BadRequestError('Specified department manager does not exist');
      }
    }

    return departmentRepository.update(id, data);
  }

  async getDepartmentUsers(id) {
    await this.getDepartmentById(id);
    const members = await departmentRepository.getDepartmentUsers(id);
    return members.map((m) => ({
      userId: m.userId,
      isPrimary: m.isPrimary,
      user: m.user,
      assignedAt: m.createdAt,
    }));
  }

  async assignUser(id, { userId, isPrimary = false }) {
    await this.getDepartmentById(id);
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User to assign was not found');
    }

    return departmentRepository.assignUser(id, userId, isPrimary);
  }

  async removeUser(id, userId) {
    await this.getDepartmentById(id);
    try {
      await departmentRepository.removeUser(id, userId);
      return { success: true, message: 'User removed from department' };
    } catch (err) {
      throw new NotFoundError('User is not assigned to this department');
    }
  }

  async deleteDepartment(id) {
    await this.getDepartmentById(id);

    // Business requirement: Do not delete departments that have active dependent records
    const dependents = await departmentRepository.countActiveDependents(id);
    if (dependents.total > 0) {
      throw new BadRequestError(
        `Cannot delete department with active dependents (${dependents.openConversations} active conversations, ${dependents.activeLeads} active leads). Please reassign them first.`
      );
    }

    await departmentRepository.softDelete(id);
    return { id, deleted: true };
  }
}

module.exports = new DepartmentService();

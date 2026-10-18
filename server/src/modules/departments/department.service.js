const departmentRepository = require('./department.repository');
const { ConflictError, NotFoundError } = require('../../errors');

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

    return departmentRepository.update(id, data);
  }

  async deleteDepartment(id) {
    await this.getDepartmentById(id);
    await departmentRepository.softDelete(id);
    return { id, deleted: true };
  }
}

module.exports = new DepartmentService();

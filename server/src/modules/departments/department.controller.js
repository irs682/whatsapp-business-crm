const departmentService = require('./department.service');
const ApiResponse = require('../../utils/apiResponse');

class DepartmentController {
  async list(req, res, next) {
    try {
      const departments = await departmentService.listDepartments(req.query);
      return ApiResponse.success(res, 'Departments retrieved successfully', departments);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const department = await departmentService.getDepartmentById(req.params.id);
      return ApiResponse.success(res, 'Department retrieved successfully', department);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const department = await departmentService.createDepartment(req.body);
      return ApiResponse.created(res, 'Department created successfully', department);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const department = await departmentService.updateDepartment(req.params.id, req.body);
      return ApiResponse.success(res, 'Department updated successfully', department);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await departmentService.deleteDepartment(req.params.id);
      return ApiResponse.success(res, 'Department removed successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DepartmentController();

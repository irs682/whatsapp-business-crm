const userService = require('./users.service');
const ApiResponse = require('../../utils/apiResponse');

class UserController {
  async list(req, res, next) {
    try {
      const result = await userService.listUsers(req.query, req.user);
      return ApiResponse.success(res, 'Users retrieved successfully', result.items, 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const user = await userService.getUserById(req.params.id, req.user);
      return ApiResponse.success(res, 'User retrieved successfully', user);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const user = await userService.createUser(req.body, req.user);
      return ApiResponse.created(res, 'User created successfully', user);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const user = await userService.updateUser(req.params.id, req.body, req.user);
      return ApiResponse.success(res, 'User updated successfully', user);
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const user = await userService.updateUserStatus(req.params.id, req.body.status, req.user);
      return ApiResponse.success(res, `User status updated to ${req.body.status}`, user);
    } catch (error) {
      next(error);
    }
  }

  async updateDepartments(req, res, next) {
    try {
      const user = await userService.updateUserDepartments(req.params.id, req.body.departmentIds, req.user);
      return ApiResponse.success(res, 'User departments updated successfully', user);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await userService.deleteUser(req.params.id, req.user);
      return ApiResponse.success(res, 'User deactivated successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();

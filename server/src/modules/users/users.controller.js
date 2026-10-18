const userService = require('./users.service');
const ApiResponse = require('../../utils/apiResponse');

class UserController {
  async list(req, res, next) {
    try {
      const result = await userService.listUsers(req.query);
      return ApiResponse.success(res, 'Users retrieved successfully', result.items, 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const user = await userService.getUserById(req.params.id);
      return ApiResponse.success(res, 'User retrieved successfully', user);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const user = await userService.createUser(req.body);
      return ApiResponse.created(res, 'User created successfully', user);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const user = await userService.updateUser(req.params.id, req.body);
      return ApiResponse.success(res, 'User updated successfully', user);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await userService.deleteUser(req.params.id);
      return ApiResponse.success(res, 'User deactivated successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();

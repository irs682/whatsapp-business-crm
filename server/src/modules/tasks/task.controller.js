const taskService = require('./task.service');
const ApiResponse = require('../../utils/apiResponse');

class TaskController {
  async list(req, res, next) {
    try {
      const result = await taskService.listTasks(req.query, req.user);
      return ApiResponse.success(res, 'Tasks fetched successfully', result.items, 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const task = await taskService.getTaskById(req.params.id, req.user);
      return ApiResponse.success(res, 'Task fetched successfully', task);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const task = await taskService.createTask(req.body, req.user);
      return ApiResponse.created(res, 'Task created successfully', task);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const task = await taskService.updateTask(req.params.id, req.body, req.user);
      return ApiResponse.success(res, 'Task updated successfully', task);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await taskService.deleteTask(req.params.id, req.user);
      return ApiResponse.success(res, 'Task deleted successfully', result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TaskController();

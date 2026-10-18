const taskService = require('./task.service');
const ApiResponse = require('../../utils/apiResponse');

class TaskController {
  async list(req, res, next) {
    try {
      const data = await taskService.list(req.query);
      return ApiResponse.success(res, 'Tasks placeholder list', data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TaskController();

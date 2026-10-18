const permissionService = require('./permission.service');
const ApiResponse = require('../../utils/apiResponse');

class PermissionController {
  async list(req, res, next) {
    try {
      const data = await permissionService.list(req.query);
      return ApiResponse.success(res, 'Permissions placeholder list', data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PermissionController();

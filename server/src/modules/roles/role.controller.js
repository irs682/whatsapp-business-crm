const roleService = require('./role.service');
const ApiResponse = require('../../utils/apiResponse');

class RoleController {
  async list(req, res, next) {
    try {
      const data = await roleService.list(req.query);
      return ApiResponse.success(res, 'Roles placeholder list', data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RoleController();

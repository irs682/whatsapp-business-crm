const templateService = require('./template.service');
const ApiResponse = require('../../utils/apiResponse');

class TemplateController {
  async list(req, res, next) {
    try {
      const data = await templateService.list(req.query);
      return ApiResponse.success(res, 'Templates placeholder list', data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TemplateController();

const reportService = require('./report.service');
const ApiResponse = require('../../utils/apiResponse');

class ReportController {
  async list(req, res, next) {
    try {
      const data = await reportService.list(req.query);
      return ApiResponse.success(res, 'Reports placeholder list', data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReportController();

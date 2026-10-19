const dashboardService = require('./dashboard.service');
const ApiResponse = require('../../utils/apiResponse');

class DashboardController {
  async getMetrics(req, res, next) {
    try {
      const data = await dashboardService.getMetrics(req.user);
      return ApiResponse.success(res, 'Dashboard metrics fetched successfully', data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();

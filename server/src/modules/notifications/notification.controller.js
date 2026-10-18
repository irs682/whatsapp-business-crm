const notificationService = require('./notification.service');
const ApiResponse = require('../../utils/apiResponse');

class NotificationController {
  async list(req, res, next) {
    try {
      const data = await notificationService.list(req.query);
      return ApiResponse.success(res, 'Notifications placeholder list', data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificationController();

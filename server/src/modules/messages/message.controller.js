const messageService = require('./message.service');
const ApiResponse = require('../../utils/apiResponse');

class MessageController {
  async list(req, res, next) {
    try {
      const data = await messageService.list(req.query);
      return ApiResponse.success(res, 'Messages placeholder list', data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MessageController();

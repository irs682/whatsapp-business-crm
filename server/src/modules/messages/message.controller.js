const messageService = require('./message.service');
const ApiResponse = require('../../utils/apiResponse');

class MessageController {
  async list(req, res, next) {
    try {
      const conversationId = req.params.conversationId || req.query.conversationId;
      if (!conversationId) {
        return ApiResponse.error(res, 'conversationId is required', 400);
      }
      const data = await messageService.listMessages(conversationId, req.query, req.user);
      return ApiResponse.success(res, 'Messages fetched successfully', data.items, 200, data.pagination);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const conversationId = req.params.conversationId || req.body.conversationId;
      if (!conversationId) {
        return ApiResponse.error(res, 'conversationId is required', 400);
      }
      const message = await messageService.createMessage(conversationId, req.body, req.user);
      return ApiResponse.created(res, 'Message sent successfully', message);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MessageController();

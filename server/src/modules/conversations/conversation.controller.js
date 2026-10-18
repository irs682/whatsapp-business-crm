const conversationService = require('./conversation.service');
const ApiResponse = require('../../utils/apiResponse');

class ConversationController {
  async list(req, res, next) {
    try {
      const data = await conversationService.list(req.query, req.user);
      return ApiResponse.success(res, 'Conversations fetched successfully', data.items, 200, data.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const conversation = await conversationService.getById(req.params.id, req.user);
      return ApiResponse.success(res, 'Conversation fetched successfully', conversation);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ConversationController();

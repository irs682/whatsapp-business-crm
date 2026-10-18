const conversationService = require('./conversation.service');
const ApiResponse = require('../../utils/apiResponse');

class ConversationController {
  async list(req, res, next) {
    try {
      const data = await conversationService.list(req.query);
      return ApiResponse.success(res, 'Conversations placeholder list', data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ConversationController();

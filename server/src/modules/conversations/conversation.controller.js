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

  async create(req, res, next) {
    try {
      const conversation = await conversationService.create(req.body, req.user);
      return ApiResponse.created(res, 'Conversation created successfully', conversation);
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const conversation = await conversationService.updateStatus(req.params.id, req.body.status, req.user);
      return ApiResponse.success(res, 'Conversation status updated successfully', conversation);
    } catch (error) {
      next(error);
    }
  }

  async updatePriority(req, res, next) {
    try {
      const conversation = await conversationService.updatePriority(req.params.id, req.body.priority, req.user);
      return ApiResponse.success(res, 'Conversation priority updated successfully', conversation);
    } catch (error) {
      next(error);
    }
  }

  async claim(req, res, next) {
    try {
      const conversation = await conversationService.claim(req.params.id, req.user);
      return ApiResponse.success(res, 'Conversation claimed successfully', conversation);
    } catch (error) {
      next(error);
    }
  }

  async assign(req, res, next) {
    try {
      const conversation = await conversationService.assign(req.params.id, req.body.assignedToUserId, req.user);
      return ApiResponse.success(res, 'Conversation assignment updated successfully', conversation);
    } catch (error) {
      next(error);
    }
  }

  async transfer(req, res, next) {
    try {
      const result = await conversationService.transfer(req.params.id, req.body, req.user);
      return ApiResponse.success(res, 'Conversation transferred successfully', result);
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const result = await conversationService.markAsRead(req.params.id, req.user);
      return ApiResponse.success(res, 'Conversation marked as read', result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ConversationController();

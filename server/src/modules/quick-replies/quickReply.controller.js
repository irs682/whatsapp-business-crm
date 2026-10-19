const quickReplyService = require('./quickReply.service');
const ApiResponse = require('../../utils/apiResponse');

class QuickReplyController {
  async list(req, res, next) {
    try {
      const items = await quickReplyService.list(req.query, req.user);
      return ApiResponse.success(res, 'Quick replies fetched successfully', items);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const item = await quickReplyService.getById(req.params.id);
      return ApiResponse.success(res, 'Quick reply fetched successfully', item);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const item = await quickReplyService.create(req.body, req.user);
      return ApiResponse.created(res, 'Quick reply created successfully', item);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const item = await quickReplyService.update(req.params.id, req.body);
      return ApiResponse.success(res, 'Quick reply updated successfully', item);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await quickReplyService.delete(req.params.id);
      return ApiResponse.success(res, 'Quick reply deleted successfully', result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new QuickReplyController();

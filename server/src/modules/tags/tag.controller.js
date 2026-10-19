const tagService = require('./tag.service');
const ApiResponse = require('../../utils/apiResponse');

class TagController {
  async list(req, res, next) {
    try {
      const tags = await tagService.listTags(req.query);
      return ApiResponse.success(res, 'Tags retrieved successfully', tags);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const tag = await tagService.getTagById(req.params.id);
      return ApiResponse.success(res, 'Tag retrieved successfully', tag);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const tag = await tagService.createTag(req.body);
      return ApiResponse.created(res, 'Tag created successfully', tag);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const tag = await tagService.updateTag(req.params.id, req.body);
      return ApiResponse.success(res, 'Tag updated successfully', tag);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await tagService.deleteTag(req.params.id);
      return ApiResponse.success(res, 'Tag removed successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TagController();

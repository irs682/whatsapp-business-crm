const segmentService = require('./segment.service');
const { createSegmentSchema, updateSegmentSchema, previewFilterSchema } = require('./segment.validation');
const ApiResponse = require('../../../utils/apiResponse');

class SegmentController {
  async list(req, res, next) {
    try {
      const result = await segmentService.list(req.query, req.user);
      return ApiResponse.success(res, 'Segments retrieved successfully', result.items, 200, result.pagination);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const validated = createSegmentSchema.parse(req.body);
      const segment = await segmentService.create(validated, req.user);
      return ApiResponse.created(res, 'Audience segment created successfully', segment);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const segment = await segmentService.getById(req.params.id, req.user);
      return ApiResponse.success(res, 'Audience segment retrieved', segment, 200);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const validated = updateSegmentSchema.parse(req.body);
      const segment = await segmentService.update(req.params.id, validated, req.user);
      return ApiResponse.success(res, 'Audience segment updated', segment, 200);
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await segmentService.delete(req.params.id, req.user);
      return ApiResponse.success(res, result.message, {}, 200);
    } catch (err) {
      next(err);
    }
  }

  async preview(req, res, next) {
    try {
      const { filters, page, limit } = previewFilterSchema.parse(req.body);
      const preview = await segmentService.preview(filters, req.user, page, limit);
      return ApiResponse.success(res, 'Audience preview generated', preview, 200);
    } catch (err) {
      next(err);
    }
  }

  async previewSaved(req, res, next) {
    try {
      const segment = await segmentService.getById(req.params.id, req.user);
      const { page, limit } = previewFilterSchema.parse({
        page: req.query.page,
        limit: req.query.limit,
      });
      const preview = await segmentService.preview(segment.filters, req.user, page, limit);
      return ApiResponse.success(res, 'Saved segment audience preview generated', {
        segment: { id: segment.id, name: segment.name },
        ...preview,
      }, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SegmentController();

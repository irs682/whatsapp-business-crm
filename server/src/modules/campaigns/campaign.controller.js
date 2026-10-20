const campaignService = require('./campaign.service');
const {
  createCampaignSchema,
  updateCampaignSchema,
  approveCampaignSchema,
  rejectCampaignSchema,
  scheduleCampaignSchema,
  campaignQuerySchema,
} = require('./campaign.validation');
const ApiResponse = require('../../utils/apiResponse');

class CampaignController {
  async list(req, res, next) {
    try {
      const query = campaignQuerySchema.parse(req.query);
      const result = await campaignService.list(query, req.user);
      return ApiResponse.success(res, 'Campaigns retrieved successfully', result.items, 200, result.pagination);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const validated = createCampaignSchema.parse(req.body);
      const campaign = await campaignService.create(validated, req.user);
      return ApiResponse.created(res, 'Campaign created successfully', campaign);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const campaign = await campaignService.getById(req.params.id, req.user);
      return ApiResponse.success(res, 'Campaign retrieved successfully', campaign, 200);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const validated = updateCampaignSchema.parse(req.body);
      const campaign = await campaignService.update(req.params.id, validated, req.user);
      return ApiResponse.success(res, 'Campaign updated successfully', campaign, 200);
    } catch (err) {
      next(err);
    }
  }

  async submitApproval(req, res, next) {
    try {
      const campaign = await campaignService.submitForApproval(req.params.id, req.user);
      return ApiResponse.success(res, 'Campaign submitted for approval', campaign, 200);
    } catch (err) {
      next(err);
    }
  }

  async approve(req, res, next) {
    try {
      const { comment } = approveCampaignSchema.parse(req.body);
      const campaign = await campaignService.approve(req.params.id, comment, req.user);
      return ApiResponse.success(res, 'Campaign approved successfully', campaign, 200);
    } catch (err) {
      next(err);
    }
  }

  async reject(req, res, next) {
    try {
      const { reason } = rejectCampaignSchema.parse(req.body);
      const campaign = await campaignService.reject(req.params.id, reason, req.user);
      return ApiResponse.success(res, 'Campaign rejected', campaign, 200);
    } catch (err) {
      next(err);
    }
  }

  async schedule(req, res, next) {
    try {
      const { scheduledAt, timezone } = scheduleCampaignSchema.parse(req.body);
      const campaign = await campaignService.schedule(req.params.id, scheduledAt, timezone, req.user);
      return ApiResponse.success(res, 'Campaign scheduled successfully', campaign, 200);
    } catch (err) {
      next(err);
    }
  }

  async start(req, res, next) {
    try {
      const campaign = await campaignService.start(req.params.id, req.user);
      return ApiResponse.success(res, 'Campaign launched successfully', campaign, 200);
    } catch (err) {
      next(err);
    }
  }

  async pause(req, res, next) {
    try {
      const campaign = await campaignService.pause(req.params.id, req.user);
      return ApiResponse.success(res, 'Campaign execution paused', campaign, 200);
    } catch (err) {
      next(err);
    }
  }

  async resume(req, res, next) {
    try {
      const campaign = await campaignService.resume(req.params.id, req.user);
      return ApiResponse.success(res, 'Campaign execution resumed', campaign, 200);
    } catch (err) {
      next(err);
    }
  }

  async cancel(req, res, next) {
    try {
      const campaign = await campaignService.cancel(req.params.id, req.user);
      return ApiResponse.success(res, 'Campaign cancelled', campaign, 200);
    } catch (err) {
      next(err);
    }
  }

  async preview(req, res, next) {
    try {
      const preview = await campaignService.preview(req.params.id, req.user);
      return ApiResponse.success(res, 'Campaign preview generated', preview, 200);
    } catch (err) {
      next(err);
    }
  }

  async getRecipients(req, res, next) {
    try {
      const result = await campaignService.getRecipients(req.params.id, req.query, req.user);
      return ApiResponse.success(res, 'Campaign recipients retrieved', result.items, 200, result.pagination);
    } catch (err) {
      next(err);
    }
  }

  async getResults(req, res, next) {
    try {
      const results = await campaignService.getResults(req.params.id, req.user);
      return ApiResponse.success(res, 'Campaign performance results retrieved', results, 200);
    } catch (err) {
      next(err);
    }
  }

  async getActivity(req, res, next) {
    try {
      const logs = await campaignService.getActivity(req.params.id, req.user);
      return ApiResponse.success(res, 'Campaign activity log retrieved', logs, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CampaignController();

const campaignService = require('./campaign.service');
const ApiResponse = require('../../utils/apiResponse');

class CampaignController {
  async list(req, res, next) {
    try {
      const data = await campaignService.list(req.query);
      return ApiResponse.success(res, 'Campaigns placeholder list', data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CampaignController();

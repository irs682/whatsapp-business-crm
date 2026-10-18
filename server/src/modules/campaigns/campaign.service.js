const campaignRepository = require('./campaign.repository');

class CampaignService {
  async list(query = {}) {
    // TODO: Follow SRS/Proposal specifications for campaigns business logic
    return {
      items: await campaignRepository.findAll(),
      message: 'Module campaigns placeholder response - scheduled for Phase roadmap',
    };
  }
}

module.exports = new CampaignService();

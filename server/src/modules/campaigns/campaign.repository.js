const prisma = require('../../config/prisma');

class CampaignRepository {
  async findAll() {
    // Placeholder repository implementation for campaigns
    return [];
  }

  async findById(id) {
    return null;
  }
}

module.exports = new CampaignRepository();

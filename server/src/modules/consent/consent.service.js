const consentRepository = require('./consent.repository');

class ConsentService {
  async list(query = {}) {
    // TODO: Follow SRS/Proposal specifications for consent business logic
    return {
      items: await consentRepository.findAll(),
      message: 'Module consent placeholder response - scheduled for Phase roadmap',
    };
  }
}

module.exports = new ConsentService();

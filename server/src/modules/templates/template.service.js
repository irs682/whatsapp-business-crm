const templateRepository = require('./template.repository');

class TemplateService {
  async list(query = {}) {
    // TODO: Follow SRS/Proposal specifications for templates business logic
    return {
      items: await templateRepository.findAll(),
      message: 'Module templates placeholder response - scheduled for Phase roadmap',
    };
  }
}

module.exports = new TemplateService();

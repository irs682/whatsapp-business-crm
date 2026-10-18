const whatsappRepository = require('./whatsapp.repository');

class WhatsappService {
  async list(query = {}) {
    // TODO: Follow SRS/Proposal specifications for whatsapp business logic
    return {
      items: await whatsappRepository.findAll(),
      message: 'Module whatsapp placeholder response - scheduled for Phase roadmap',
    };
  }
}

module.exports = new WhatsappService();

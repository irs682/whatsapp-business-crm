const messageRepository = require('./message.repository');

class MessageService {
  async list(query = {}) {
    // TODO: Follow SRS/Proposal specifications for messages business logic
    return {
      items: await messageRepository.findAll(),
      message: 'Module messages placeholder response - scheduled for Phase roadmap',
    };
  }
}

module.exports = new MessageService();

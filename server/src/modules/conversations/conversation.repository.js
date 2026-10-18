const prisma = require('../../config/prisma');

class ConversationRepository {
  async findAll() {
    // Placeholder repository implementation for conversations
    return [];
  }

  async findById(id) {
    return null;
  }
}

module.exports = new ConversationRepository();

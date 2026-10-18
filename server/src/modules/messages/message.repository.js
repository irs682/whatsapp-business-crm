const prisma = require('../../config/prisma');

class MessageRepository {
  async findAll() {
    // Placeholder repository implementation for messages
    return [];
  }

  async findById(id) {
    return null;
  }
}

module.exports = new MessageRepository();

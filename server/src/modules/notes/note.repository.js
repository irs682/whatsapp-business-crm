const prisma = require('../../config/prisma');

class NoteRepository {
  async findAll() {
    // Placeholder repository implementation for notes
    return [];
  }

  async findById(id) {
    return null;
  }
}

module.exports = new NoteRepository();

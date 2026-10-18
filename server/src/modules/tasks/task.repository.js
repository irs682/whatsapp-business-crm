const prisma = require('../../config/prisma');

class TaskRepository {
  async findAll() {
    // Placeholder repository implementation for tasks
    return [];
  }

  async findById(id) {
    return null;
  }
}

module.exports = new TaskRepository();

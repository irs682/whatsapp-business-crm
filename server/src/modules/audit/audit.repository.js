const prisma = require('../../config/prisma');

class AuditRepository {
  async findAll() {
    // Placeholder repository implementation for audit
    return [];
  }

  async findById(id) {
    return null;
  }
}

module.exports = new AuditRepository();

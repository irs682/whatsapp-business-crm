const roleRepository = require('./role.repository');

class RoleService {
  async list(query = {}) {
    // TODO: Follow SRS/Proposal specifications for roles business logic
    return {
      items: await roleRepository.findAll(),
      message: 'Module roles placeholder response - scheduled for Phase roadmap',
    };
  }
}

module.exports = new RoleService();

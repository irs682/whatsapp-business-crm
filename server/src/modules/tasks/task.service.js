const taskRepository = require('./task.repository');

class TaskService {
  async list(query = {}) {
    // TODO: Follow SRS/Proposal specifications for tasks business logic
    return {
      items: await taskRepository.findAll(),
      message: 'Module tasks placeholder response - scheduled for Phase roadmap',
    };
  }
}

module.exports = new TaskService();

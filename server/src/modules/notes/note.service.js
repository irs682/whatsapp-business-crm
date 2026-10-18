const noteRepository = require('./note.repository');

class NoteService {
  async list(query = {}) {
    // TODO: Follow SRS/Proposal specifications for notes business logic
    return {
      items: await noteRepository.findAll(),
      message: 'Module notes placeholder response - scheduled for Phase roadmap',
    };
  }
}

module.exports = new NoteService();

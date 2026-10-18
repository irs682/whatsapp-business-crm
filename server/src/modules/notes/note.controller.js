const noteService = require('./note.service');
const ApiResponse = require('../../utils/apiResponse');

class NoteController {
  async list(req, res, next) {
    try {
      const data = await noteService.list(req.query);
      return ApiResponse.success(res, 'Notes placeholder list', data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NoteController();

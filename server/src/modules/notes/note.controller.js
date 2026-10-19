const noteService = require('./note.service');
const ApiResponse = require('../../utils/apiResponse');

class NoteController {
  async list(req, res, next) {
    try {
      const result = await noteService.listNotes(req.query, req.user);
      return ApiResponse.success(res, 'Notes fetched successfully', result.items, 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const note = await noteService.createNote(req.body, req.user);
      return ApiResponse.created(res, 'Note created successfully', note);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await noteService.deleteNote(req.params.id, req.user);
      return ApiResponse.success(res, 'Note deleted successfully', result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NoteController();

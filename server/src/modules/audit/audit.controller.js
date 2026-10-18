const auditService = require('./audit.service');
const ApiResponse = require('../../utils/apiResponse');

class AuditController {
  async list(req, res, next) {
    try {
      const data = await auditService.list(req.query);
      return ApiResponse.success(res, 'Audit placeholder list', data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuditController();

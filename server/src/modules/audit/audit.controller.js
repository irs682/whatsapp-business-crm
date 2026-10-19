const auditService = require('./audit.service');
const ApiResponse = require('../../utils/apiResponse');

class AuditController {
  async list(req, res, next) {
    try {
      const data = await auditService.list(req.query, req.user);
      return ApiResponse.success(res, 'Audit logs retrieved successfully', data);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const data = await auditService.findById(req.params.id, req.user);
      return ApiResponse.success(res, 'Audit log entry retrieved successfully', data);
    } catch (error) {
      next(error);
    }
  }

  async export(req, res, next) {
    try {
      const file = await auditService.exportCsv(req.query, req.user, req.ip);
      res.setHeader('Content-Type', file.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      return res.status(200).send(file.data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuditController();

const reportService = require('./report.service');
const ApiResponse = require('../../utils/apiResponse');

class ReportController {
  async executive(req, res, next) {
    try {
      const data = await reportService.getExecutiveReport(req.query, req.user);
      return ApiResponse.success(res, 'Executive report metrics retrieved', data);
    } catch (error) {
      next(error);
    }
  }

  async conversations(req, res, next) {
    try {
      const data = await reportService.getConversationReport(req.query, req.user);
      return ApiResponse.success(res, 'Conversation metrics retrieved', data);
    } catch (error) {
      next(error);
    }
  }

  async agents(req, res, next) {
    try {
      const data = await reportService.getAgentReport(req.query, req.user);
      return ApiResponse.success(res, 'Agent performance metrics retrieved', data);
    } catch (error) {
      next(error);
    }
  }

  async departments(req, res, next) {
    try {
      const data = await reportService.getDepartmentReport(req.query, req.user);
      return ApiResponse.success(res, 'Department performance metrics retrieved', data);
    } catch (error) {
      next(error);
    }
  }

  async contacts(req, res, next) {
    try {
      const data = await reportService.getCustomerReport(req.query, req.user);
      return ApiResponse.success(res, 'Customer and contact metrics retrieved', data);
    } catch (error) {
      next(error);
    }
  }

  async leads(req, res, next) {
    try {
      const data = await reportService.getLeadReport(req.query, req.user);
      return ApiResponse.success(res, 'Lead pipeline metrics retrieved', data);
    } catch (error) {
      next(error);
    }
  }

  async whatsapp(req, res, next) {
    try {
      const data = await reportService.getWhatsAppReport(req.query, req.user);
      return ApiResponse.success(res, 'WhatsApp messaging metrics retrieved', data);
    } catch (error) {
      next(error);
    }
  }

  async campaigns(req, res, next) {
    try {
      const data = await reportService.getCampaignReport(req.query, req.user);
      return ApiResponse.success(res, 'Campaign performance metrics retrieved', data);
    } catch (error) {
      next(error);
    }
  }

  async tasks(req, res, next) {
    try {
      const data = await reportService.getTaskReport(req.query, req.user);
      return ApiResponse.success(res, 'Task and follow-up metrics retrieved', data);
    } catch (error) {
      next(error);
    }
  }

  async exportReport(req, res, next) {
    try {
      const type = req.body?.type || req.query?.type || 'executive';
      const mergedQuery = { ...req.query, ...(req.body?.filters || req.body) };
      delete mergedQuery.type;

      const file = await reportService.exportReport(type, mergedQuery, req.user, req.ip);
      res.setHeader('Content-Type', file.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      return res.status(200).send(file.data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReportController();

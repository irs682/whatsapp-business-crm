const leadService = require('./lead.service');
const ApiResponse = require('../../utils/apiResponse');

class LeadController {
  async list(req, res, next) {
    try {
      const result = await leadService.listLeads(req.query, req.user);
      return ApiResponse.success(res, 'Leads fetched successfully', result.items, 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const lead = await leadService.getLeadById(req.params.id, req.user);
      return ApiResponse.success(res, 'Lead fetched successfully', lead);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const lead = await leadService.createLead(req.body, req.user);
      return ApiResponse.created(res, 'Lead created successfully', lead);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const lead = await leadService.updateLead(req.params.id, req.body, req.user);
      return ApiResponse.success(res, 'Lead updated successfully', lead);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await leadService.deleteLead(req.params.id, req.user);
      return ApiResponse.success(res, 'Lead deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async listStages(req, res, next) {
    try {
      const stages = await leadService.listStages();
      return ApiResponse.success(res, 'Pipeline stages fetched successfully', stages);
    } catch (error) {
      next(error);
    }
  }

  async createStage(req, res, next) {
    try {
      const stage = await leadService.createStage(req.body);
      return ApiResponse.created(res, 'Pipeline stage created successfully', stage);
    } catch (error) {
      next(error);
    }
  }

  async updateStage(req, res, next) {
    try {
      const stage = await leadService.updateStage(req.params.id, req.body);
      return ApiResponse.success(res, 'Pipeline stage updated successfully', stage);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new LeadController();


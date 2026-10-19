const automationService = require('./automation.service');
const { createRuleSchema, updateRuleSchema } = require('./automation.validation');
const ApiResponse = require('../../../utils/ApiResponse');

class AutomationController {
  async list(req, res, next) {
    try {
      const rules = await automationService.listRules(req.user);
      return ApiResponse.success(res, 'Marketing automation rules retrieved', rules, 200);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const validated = createRuleSchema.parse(req.body);
      const rule = await automationService.createRule(validated, req.user);
      return ApiResponse.created(res, 'Automation rule created successfully', rule);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const rule = await automationService.getRuleById(req.params.id, req.user);
      return ApiResponse.success(res, 'Automation rule retrieved', rule, 200);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const validated = updateRuleSchema.parse(req.body);
      const rule = await automationService.updateRule(req.params.id, validated, req.user);
      return ApiResponse.success(res, 'Automation rule updated', rule, 200);
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await automationService.deleteRule(req.params.id, req.user);
      return ApiResponse.success(res, result.message, {}, 200);
    } catch (err) {
      next(err);
    }
  }

  async getExecutions(req, res, next) {
    try {
      const result = await automationService.getExecutions(req.params.id, req.user, req.query.page, req.query.limit);
      return ApiResponse.success(res, 'Rule execution history retrieved', result.items, 200, result.pagination);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AutomationController();

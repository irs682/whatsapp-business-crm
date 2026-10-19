const consentService = require('./consent.service');
const { recordConsentSchema } = require('./consent.validation');
const ApiResponse = require('../../utils/ApiResponse');

class ConsentController {
  async list(req, res, next) {
    try {
      const result = await consentService.list(req.query, req.user);
      return ApiResponse.success(res, 'Consent records retrieved', result.items, 200, result.pagination);
    } catch (err) {
      next(err);
    }
  }

  async getContactConsent(req, res, next) {
    try {
      const status = await consentService.getConsentStatus(req.params.id, req.user);
      return ApiResponse.success(res, 'Contact consent status retrieved', status, 200);
    } catch (err) {
      next(err);
    }
  }

  async recordContactConsent(req, res, next) {
    try {
      const validated = recordConsentSchema.parse(req.body);
      const result = await consentService.recordConsent(req.params.id, validated, req.user);
      return ApiResponse.success(res, 'Marketing consent recorded successfully', result, 200);
    } catch (err) {
      next(err);
    }
  }

  async getContactConsentHistory(req, res, next) {
    try {
      const history = await consentService.getConsentHistory(req.params.id, req.user);
      return ApiResponse.success(res, 'Consent audit history retrieved', history, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ConsentController();

const consentService = require('./consent.service');
const ApiResponse = require('../../utils/apiResponse');

class ConsentController {
  async list(req, res, next) {
    try {
      const data = await consentService.list(req.query);
      return ApiResponse.success(res, 'Consent placeholder list', data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ConsentController();

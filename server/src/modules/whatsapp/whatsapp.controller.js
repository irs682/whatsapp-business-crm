const whatsappService = require('./whatsapp.service');
const ApiResponse = require('../../utils/apiResponse');

class WhatsappController {
  async list(req, res, next) {
    try {
      const data = await whatsappService.list(req.query);
      return ApiResponse.success(res, 'Whatsapp placeholder list', data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WhatsappController();

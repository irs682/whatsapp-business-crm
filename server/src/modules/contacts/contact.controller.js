const contactService = require('./contact.service');
const ApiResponse = require('../../utils/apiResponse');

class ContactController {
  async list(req, res, next) {
    try {
      const result = await contactService.listContacts(req.query, req.user);
      return ApiResponse.success(res, 'Contacts fetched successfully', result.items, 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const contact = await contactService.getContactById(req.params.id, req.user);
      return ApiResponse.success(res, 'Contact fetched successfully', contact);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const contact = await contactService.createContact(req.body, req.user);
      return ApiResponse.created(res, 'Contact created successfully', contact);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const contact = await contactService.updateContact(req.params.id, req.body, req.user);
      return ApiResponse.success(res, 'Contact updated successfully', contact);
    } catch (error) {
      next(error);
    }
  }

  async importContacts(req, res, next) {
    try {
      const result = await contactService.importContacts(req.body, req.user);
      const message = req.body.preview ? 'CSV import preview generated' : 'Contacts imported successfully';
      return ApiResponse.success(res, message, result);
    } catch (error) {
      next(error);
    }
  }

  async getActivity(req, res, next) {
    try {
      const activities = await contactService.getContactActivity(req.params.id, req.user);
      return ApiResponse.success(res, 'Contact activity history fetched successfully', activities);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await contactService.deleteContact(req.params.id, req.user);
      return ApiResponse.success(res, 'Contact archived successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ContactController();

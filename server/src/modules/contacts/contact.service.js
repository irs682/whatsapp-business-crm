const contactRepository = require('./contact.repository');
const { ConflictError, NotFoundError } = require('../../errors');
const { getPagination, formatPaginatedResponse } = require('../../utils/pagination');

class ContactService {
  async listContacts(query) {
    const { page, limit, skip, orderBy } = getPagination(query);

    const where = {
      deletedAt: null,
      ...(query.consentStatus && { consentStatus: query.consentStatus }),
      ...(query.isOptedOut !== undefined && { isOptedOut: query.isOptedOut === 'true' }),
      ...(query.tag && { tags: { has: query.tag } }),
      ...(query.search && {
        OR: [
          { phone: { contains: query.search, mode: 'insensitive' } },
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const { total, items } = await contactRepository.findAll({ skip, limit, orderBy, where });
    return formatPaginatedResponse(items, total, page, limit);
  }

  async getContactById(id) {
    const contact = await contactRepository.findById(id);
    if (!contact) {
      throw new NotFoundError('Contact not found');
    }
    return contact;
  }

  async createContact(data) {
    const existing = await contactRepository.findByPhone(data.phone);
    if (existing) {
      throw new ConflictError('A contact with this phone number already exists');
    }

    if (data.waId) {
      const existingWa = await contactRepository.findByWaId(data.waId);
      if (existingWa) {
        throw new ConflictError('A contact with this WhatsApp ID already exists');
      }
    }

    return contactRepository.create(data);
  }

  async updateContact(id, data) {
    await this.getContactById(id);

    if (data.phone) {
      const existing = await contactRepository.findByPhone(data.phone);
      if (existing && existing.id !== id) {
        throw new ConflictError('Phone number is already associated with another contact');
      }
    }

    if (data.isOptedOut === true) {
      data.optOutAt = new Date();
    } else if (data.isOptedOut === false) {
      data.optOutAt = null;
    }

    return contactRepository.update(id, data);
  }

  async deleteContact(id) {
    await this.getContactById(id);
    await contactRepository.softDelete(id);
    return { id, deleted: true };
  }
}

module.exports = new ContactService();

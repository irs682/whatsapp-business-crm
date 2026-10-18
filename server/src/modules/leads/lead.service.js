const leadRepository = require('./lead.repository');
const contactRepository = require('../contacts/contact.repository');
const { NotFoundError } = require('../../errors');
const { getPagination, formatPaginatedResponse } = require('../../utils/pagination');

class LeadService {
  async listLeads(query) {
    const { page, limit, skip, orderBy } = getPagination(query);

    const where = {
      deletedAt: null,
      ...(query.stage && { stage: query.stage }),
      ...(query.contactId && { contactId: query.contactId }),
      ...(query.assignedToUserId && { assignedToUserId: query.assignedToUserId }),
      ...(query.departmentId && { departmentId: query.departmentId }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { contact: { firstName: { contains: query.search, mode: 'insensitive' } } },
          { contact: { lastName: { contains: query.search, mode: 'insensitive' } } },
          { contact: { phone: { contains: query.search, mode: 'insensitive' } } },
        ],
      }),
    };

    const { total, items } = await leadRepository.findAll({ skip, limit, orderBy, where });
    return formatPaginatedResponse(items, total, page, limit);
  }

  async getLeadById(id) {
    const lead = await leadRepository.findById(id);
    if (!lead) {
      throw new NotFoundError('Lead not found');
    }
    return lead;
  }

  async createLead(data) {
    const contact = await contactRepository.findById(data.contactId);
    if (!contact) {
      throw new NotFoundError('Associated contact was not found');
    }

    return leadRepository.create(data);
  }

  async updateLead(id, data) {
    await this.getLeadById(id);
    return leadRepository.update(id, data);
  }

  async deleteLead(id) {
    await this.getLeadById(id);
    await leadRepository.softDelete(id);
    return { id, deleted: true };
  }
}

module.exports = new LeadService();

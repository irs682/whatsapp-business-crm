const leadRepository = require('./lead.repository');
const contactRepository = require('../contacts/contact.repository');
const { NotFoundError, ForbiddenError, ConflictError } = require('../../errors');
const { getPagination, formatPaginatedResponse } = require('../../utils/pagination');
const { logActivity } = require('../../utils/activityLogger');

class LeadService {
  async listLeads(query, user) {
    const { page, limit, skip, orderBy } = getPagination(query);
    const isPrivileged = user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN');
    const userDeptIds = (user?.departments || []).map((d) => d.id);

    const where = {
      deletedAt: null,
      ...(query.stage && { stage: query.stage }),
      ...(query.pipelineStageId && { pipelineStageId: query.pipelineStageId }),
      ...(query.contactId && { contactId: query.contactId }),
      ...(query.assignedToUserId && { assignedToUserId: query.assignedToUserId }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { contact: { firstName: { contains: query.search, mode: 'insensitive' } } },
          { contact: { lastName: { contains: query.search, mode: 'insensitive' } } },
          { contact: { phone: { contains: query.search, mode: 'insensitive' } } },
          { contact: { company: { contains: query.search, mode: 'insensitive' } } },
        ],
      }),
    };

    // Department isolation: Non-privileged users only see leads in their departments or assigned to them
    if (!isPrivileged) {
      where.OR = [
        { departmentId: { in: userDeptIds } },
        { assignedToUserId: user?.id },
        { departmentId: null },
      ];
    } else if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    const { total, items } = await leadRepository.findAll({ skip, limit, orderBy, where });
    return formatPaginatedResponse(items, total, page, limit);
  }

  async getLeadById(id, user) {
    const lead = await leadRepository.findById(id);
    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    if (user && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      const userDeptIds = (user.departments || []).map((d) => d.id);
      const isAssigned = lead.assignedToUserId === user.id;
      const isAuthorizedDept = lead.departmentId && userDeptIds.includes(lead.departmentId);
      const isUnassigned = !lead.departmentId && !lead.assignedToUserId;

      if (!isAssigned && !isAuthorizedDept && !isUnassigned) {
        throw new ForbiddenError('You do not have access to leads belonging to unauthorized departments');
      }
    }

    return lead;
  }

  async createLead(data, user) {
    const contact = await contactRepository.findById(data.contactId);
    if (!contact) {
      throw new NotFoundError('Associated contact was not found');
    }

    // Assign owner & department defaults
    const assignedUserId = data.assignedToUserId || data.ownerId || user?.id || null;
    const departmentId = data.departmentId || contact.departmentId || null;

    // Resolve pipelineStageId if not explicitly supplied
    let pipelineStageId = data.pipelineStageId;
    if (!pipelineStageId) {
      const defaultStage = await leadRepository.findStageByName(data.stage || 'NEW');
      if (defaultStage) {
        pipelineStageId = defaultStage.id;
      }
    }

    const { ownerId, ...leadFields } = data;
    leadFields.assignedToUserId = assignedUserId;
    leadFields.departmentId = departmentId;
    leadFields.pipelineStageId = pipelineStageId;

    const lead = await leadRepository.create(leadFields);

    await logActivity({
      actorId: user?.id,
      action: 'LEAD_CREATED',
      entityType: 'LEAD',
      entityId: lead.id,
      contactId: lead.contactId,
      leadId: lead.id,
      description: `Lead created: "${lead.title}" for ${contact.firstName || ''} ${contact.lastName || ''}`,
      metadata: { stage: lead.stage, value: lead.value },
    });

    return lead;
  }

  async updateLead(id, data, user) {
    const currentLead = await this.getLeadById(id, user);

    const { ownerId, ...leadFields } = data;
    if (ownerId !== undefined) {
      leadFields.assignedToUserId = ownerId;
    }

    // Check if stage changed
    const isStageChange =
      (data.stage && data.stage !== currentLead.stage) ||
      (data.pipelineStageId && data.pipelineStageId !== currentLead.pipelineStageId);

    const updated = await leadRepository.update(id, leadFields);

    if (isStageChange) {
      await logActivity({
        actorId: user?.id,
        action: 'LEAD_STAGE_CHANGED',
        entityType: 'LEAD',
        entityId: id,
        contactId: currentLead.contactId,
        leadId: id,
        description: `Lead "${updated.title}" stage changed to ${updated.stage}`,
        metadata: { from: currentLead.stage, to: updated.stage, outcome: updated.outcome },
      });
    } else {
      await logActivity({
        actorId: user?.id,
        action: 'LEAD_UPDATED',
        entityType: 'LEAD',
        entityId: id,
        contactId: currentLead.contactId,
        leadId: id,
        description: `Lead "${updated.title}" updated by ${user?.firstName || 'User'}`,
        metadata: { updatedFields: Object.keys(data) },
      });
    }

    return updated;
  }

  async deleteLead(id, user) {
    const lead = await this.getLeadById(id, user);
    await leadRepository.softDelete(id);

    await logActivity({
      actorId: user?.id,
      action: 'LEAD_DELETED',
      entityType: 'LEAD',
      entityId: id,
      contactId: lead.contactId,
      leadId: id,
      description: `Lead "${lead.title}" deleted by ${user?.firstName || 'User'}`,
    });

    return { id, deleted: true };
  }

  // Pipeline Stages Service
  async listStages() {
    return leadRepository.findAllStages();
  }

  async createStage(data) {
    const existing = await leadRepository.findStageByName(data.name);
    if (existing) {
      throw new ConflictError('A pipeline stage with this name already exists');
    }
    return leadRepository.createStage(data);
  }

  async updateStage(id, data) {
    const stage = await leadRepository.findStageById(id);
    if (!stage) {
      throw new NotFoundError('Pipeline stage not found');
    }
    if (data.name && data.name !== stage.name) {
      const existing = await leadRepository.findStageByName(data.name);
      if (existing) throw new ConflictError('A pipeline stage with this name already exists');
    }
    return leadRepository.updateStage(id, data);
  }
}

module.exports = new LeadService();

const prisma = require('../../config/prisma');
const { ApiError } = require('../../errors');
const campaignQueue = require('./campaign.queue');
const { CAMPAIGN_STATUS, ALLOWED_STATUS_TRANSITIONS } = require('./campaign.constants');
const segmentService = require('../marketing/segments/segment.service');

class CampaignService {
  /**
   * Verify department and campaign access permissions
   */
  async verifyCampaignAccess(campaignId, user) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        template: true,
        audienceSegment: true,
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        department: { select: { id: true, name: true } },
      },
    });

    if (!campaign || campaign.deletedAt) {
      throw new ApiError(404, 'Campaign not found');
    }

    const userRole = typeof user.role === 'string' ? user.role : user.role?.name;
    const isGlobal = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    if (!isGlobal && campaign.departmentId) {
      const allowed = (user.departments || []).some((d) => (d.id || d.departmentId) === campaign.departmentId);
      if (!allowed && campaign.createdById !== user.id) {
        throw new ApiError(403, 'Forbidden: Campaign belongs to an unauthorized department');
      }
    }

    return campaign;
  }

  /**
   * List campaigns with department scoping and filters
   */
  async list(query = {}, user = {}) {
    const { status, type, departmentId, search, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = { deletedAt: null };

    const userRole = typeof user.role === 'string' ? user.role : user.role?.name;
    const isGlobal = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    if (!isGlobal) {
      const userDeptIds = (user.departments || []).map((d) => d.id || d.departmentId).filter(Boolean);
      where.OR = [
        { departmentId: { in: userDeptIds } },
        { createdById: user.id },
      ];
    } else if (departmentId) {
      where.departmentId = departmentId;
    }

    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [total, items] = await Promise.all([
      prisma.campaign.count({ where }),
      prisma.campaign.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          template: { select: { id: true, name: true, category: true, status: true } },
          audienceSegment: { select: { id: true, name: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          approvedBy: { select: { id: true, firstName: true, lastName: true } },
          department: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)) || 1,
      },
    };
  }

  /**
   * Create a new draft campaign
   */
  async create(data, user) {
    const { name, description, type, audienceSegmentId, templateId, departmentId, parameters, timezone, scheduledAt } = data;

    // Validate template if provided
    if (templateId) {
      const template = await prisma.messageTemplate.findUnique({ where: { id: templateId } });
      if (!template) throw new ApiError(404, 'Selected template not found');
    }

    // Validate segment if provided
    if (audienceSegmentId) {
      const segment = await prisma.marketingSegment.findUnique({ where: { id: audienceSegmentId } });
      if (!segment) throw new ApiError(404, 'Selected audience segment not found');
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        description,
        type: type || 'BROADCAST',
        audienceSegmentId,
        templateId,
        departmentId: departmentId || (user.departments?.[0]?.departmentId || null),
        createdById: user.id,
        parameters: parameters || null,
        timezone: timezone || 'UTC',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: CAMPAIGN_STATUS.DRAFT,
      },
      include: {
        template: true,
        audienceSegment: true,
      },
    });

    await prisma.campaignActivityLog.create({
      data: {
        campaignId: campaign.id,
        actorId: user.id,
        action: 'CREATED',
        details: { name: campaign.name, type: campaign.type },
      },
    });

    return campaign;
  }

  /**
   * Retrieve campaign by ID
   */
  async getById(id, user) {
    return this.verifyCampaignAccess(id, user);
  }

  /**
   * Update campaign (invalidates approval if approved campaign is modified)
   */
  async update(id, data, user) {
    const campaign = await this.verifyCampaignAccess(id, user);

    if ([CAMPAIGN_STATUS.RUNNING, CAMPAIGN_STATUS.COMPLETED, CAMPAIGN_STATUS.CANCELLED].includes(campaign.status)) {
      throw new ApiError(400, `Cannot edit campaign in "${campaign.status}" state.`);
    }

    const updateData = { ...data, updatedAt: new Date() };

    // Invalidate approval if key configuration changed
    const isMaterialChange =
      (data.templateId && data.templateId !== campaign.templateId) ||
      (data.audienceSegmentId && data.audienceSegmentId !== campaign.audienceSegmentId) ||
      (data.parameters && JSON.stringify(data.parameters) !== JSON.stringify(campaign.parameters));

    if (campaign.status === CAMPAIGN_STATUS.APPROVED && isMaterialChange) {
      updateData.status = CAMPAIGN_STATUS.DRAFT;
      updateData.approvedById = null;
      updateData.approvalComment = null;

      await prisma.campaignActivityLog.create({
        data: {
          campaignId: id,
          actorId: user.id,
          action: 'APPROVAL_INVALIDATED',
          details: { reason: 'Material content or audience changes made after approval' },
        },
      });
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: updateData,
      include: {
        template: true,
        audienceSegment: true,
      },
    });

    return updated;
  }

  /**
   * Submit campaign for review
   */
  async submitForApproval(id, user) {
    const campaign = await this.verifyCampaignAccess(id, user);

    if (campaign.status !== CAMPAIGN_STATUS.DRAFT && campaign.status !== CAMPAIGN_STATUS.REJECTED) {
      throw new ApiError(400, `Only DRAFT or REJECTED campaigns can be submitted for approval. Current status: "${campaign.status}"`);
    }

    if (!campaign.templateId) {
      throw new ApiError(400, 'Campaign must have an approved template selected before submission.');
    }

    if (!campaign.audienceSegmentId) {
      throw new ApiError(400, 'Campaign must have an audience segment selected before submission.');
    }

    const template = await prisma.messageTemplate.findUnique({ where: { id: campaign.templateId } });
    if (!template || template.status !== 'APPROVED') {
      throw new ApiError(400, 'The selected WhatsApp template is not approved by Meta.');
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        status: CAMPAIGN_STATUS.PENDING_APPROVAL,
        rejectionReason: null,
        updatedAt: new Date(),
      },
    });

    await prisma.campaignActivityLog.create({
      data: {
        campaignId: id,
        actorId: user.id,
        action: 'SUBMITTED',
        details: { submittedAt: new Date() },
      },
    });

    return updated;
  }

  /**
   * Approve campaign (Maker-Checker enforced)
   */
  async approve(id, comment, approverUser) {
    const campaign = await this.verifyCampaignAccess(id, approverUser);

    if (campaign.status !== CAMPAIGN_STATUS.PENDING_APPROVAL) {
      throw new ApiError(400, `Cannot approve campaign with status "${campaign.status}". Must be PENDING_APPROVAL.`);
    }

    // Maker-checker policy: Creator cannot approve their own campaign
    // unless user is explicitly SUPER_ADMIN or ADMIN
    const approverRole = typeof approverUser.role === 'string' ? approverUser.role : approverUser.role?.name;
    if (campaign.createdById === approverUser.id && approverRole !== 'SUPER_ADMIN' && approverRole !== 'ADMIN') {
      throw new ApiError(403, 'Maker-Checker policy violation: Campaign creator cannot self-approve campaign.');
    }

    // Re-verify template is still approved
    const template = await prisma.messageTemplate.findUnique({ where: { id: campaign.templateId } });
    if (!template || template.status !== 'APPROVED') {
      throw new ApiError(400, 'Cannot approve campaign: Selected WhatsApp template is not APPROVED.');
    }

    const [updated] = await prisma.$transaction([
      prisma.campaign.update({
        where: { id },
        data: {
          status: CAMPAIGN_STATUS.APPROVED,
          approvedById: approverUser.id,
          approvalComment: comment || null,
          updatedAt: new Date(),
        },
      }),
      prisma.campaignApproval.create({
        data: {
          campaignId: id,
          approverId: approverUser.id,
          action: 'APPROVED',
          comment: comment || null,
        },
      }),
    ]);

    await prisma.campaignActivityLog.create({
      data: {
        campaignId: id,
        actorId: approverUser.id,
        action: 'APPROVED',
        details: { comment },
      },
    });

    return updated;
  }

  /**
   * Reject campaign with reason
   */
  async reject(id, reason, approverUser) {
    const campaign = await this.verifyCampaignAccess(id, approverUser);

    if (campaign.status !== CAMPAIGN_STATUS.PENDING_APPROVAL) {
      throw new ApiError(400, `Cannot reject campaign with status "${campaign.status}".`);
    }

    const [updated] = await prisma.$transaction([
      prisma.campaign.update({
        where: { id },
        data: {
          status: CAMPAIGN_STATUS.REJECTED,
          rejectionReason: reason,
          updatedAt: new Date(),
        },
      }),
      prisma.campaignApproval.create({
        data: {
          campaignId: id,
          approverId: approverUser.id,
          action: 'REJECTED',
          comment: reason,
        },
      }),
    ]);

    await prisma.campaignActivityLog.create({
      data: {
        campaignId: id,
        actorId: approverUser.id,
        action: 'REJECTED',
        details: { reason },
      },
    });

    return updated;
  }

  /**
   * Schedule approved campaign for future execution
   */
  async schedule(id, scheduledAt, timezone, user) {
    const campaign = await this.verifyCampaignAccess(id, user);

    if (campaign.status !== CAMPAIGN_STATUS.APPROVED) {
      throw new ApiError(400, `Only APPROVED campaigns can be scheduled. Current status: "${campaign.status}"`);
    }

    const targetDate = new Date(scheduledAt);
    if (isNaN(targetDate.getTime()) || targetDate <= new Date()) {
      throw new ApiError(400, 'Scheduled date must be a valid future ISO datetime.');
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        status: CAMPAIGN_STATUS.SCHEDULED,
        scheduledAt: targetDate,
        timezone: timezone || 'UTC',
        updatedAt: new Date(),
      },
    });

    await prisma.campaignActivityLog.create({
      data: {
        campaignId: id,
        actorId: user.id,
        action: 'SCHEDULED',
        details: { scheduledAt: targetDate, timezone },
      },
    });

    return updated;
  }

  /**
   * Launch campaign immediately
   */
  async start(id, user) {
    await this.verifyCampaignAccess(id, user);
    return campaignQueue.snapshotAndLaunch(id, user.id);
  }

  /**
   * Pause running campaign
   */
  async pause(id, user) {
    await this.verifyCampaignAccess(id, user);
    return campaignQueue.pause(id, user.id);
  }

  /**
   * Resume paused campaign
   */
  async resume(id, user) {
    await this.verifyCampaignAccess(id, user);
    return campaignQueue.resume(id, user.id);
  }

  /**
   * Cancel campaign
   */
  async cancel(id, user) {
    await this.verifyCampaignAccess(id, user);
    return campaignQueue.cancel(id, user.id);
  }

  /**
   * Preview personalized message for a campaign
   */
  async preview(id, user) {
    const campaign = await this.verifyCampaignAccess(id, user);

    if (!campaign.audienceSegment) {
      throw new ApiError(400, 'Campaign does not have an audience segment defined.');
    }

    const audiencePreview = await segmentService.preview(campaign.audienceSegment.filters, user, 1, 5);

    let samplePersonalizedMessage = null;
    if (campaign.template) {
      let body = campaign.template.body;
      const sampleContact = audiencePreview.sampleContacts[0] || { firstName: 'Alex', company: 'Acme Corp' };

      if (campaign.parameters && typeof campaign.parameters === 'object') {
        for (const [k, field] of Object.entries(campaign.parameters)) {
          const val = sampleContact[field] || field;
          body = body.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), val);
        }
      }
      samplePersonalizedMessage = body;
    }

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        templateName: campaign.template?.name,
      },
      samplePersonalizedMessage,
      ...audiencePreview,
    };
  }

  /**
   * Retrieve campaign recipients
   */
  async getRecipients(id, query = {}, user) {
    await this.verifyCampaignAccess(id, user);
    const { status, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = { campaignId: id };
    if (status) where.recipientStatus = status;

    const [total, items] = await Promise.all([
      prisma.campaignRecipient.count({ where }),
      prisma.campaignRecipient.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          contact: {
            select: { id: true, firstName: true, lastName: true, phone: true, waId: true, company: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)) || 1,
      },
    };
  }

  /**
   * Retrieve campaign performance metrics & analytics
   */
  async getResults(id, user) {
    const campaign = await this.verifyCampaignAccess(id, user);

    const sent = campaign.sentCount;
    const delivered = campaign.deliveredCount;
    const read = campaign.readCount;
    const failed = campaign.failedCount;
    const replies = campaign.repliedCount;
    const optOuts = campaign.optOutCount;

    const deliveryRate = sent > 0 ? Number(((delivered / sent) * 100).toFixed(1)) : 0;
    const readRate = delivered > 0 ? Number(((read / delivered) * 100).toFixed(1)) : 0;
    const responseRate = delivered > 0 ? Number(((replies / delivered) * 100).toFixed(1)) : 0;

    return {
      campaignId: campaign.id,
      name: campaign.name,
      status: campaign.status,
      type: campaign.type,
      startedAt: campaign.startedAt,
      completedAt: campaign.completedAt,
      metrics: {
        totalRecipients: campaign.totalRecipients,
        eligibleCount: campaign.eligibleCount,
        suppressedCount: campaign.suppressedCount,
        sentCount: sent,
        deliveredCount: delivered,
        readCount: read,
        failedCount: failed,
        repliedCount: replies,
        optOutCount: optOuts,
        deliveryRate,
        readRate,
        responseRate,
      },
    };
  }

  /**
   * Retrieve campaign activity log
   */
  async getActivity(id, user) {
    await this.verifyCampaignAccess(id, user);

    const logs = await prisma.campaignActivityLog.findMany({
      where: { campaignId: id },
      orderBy: { createdAt: 'desc' },
    });

    return logs;
  }
}

module.exports = new CampaignService();

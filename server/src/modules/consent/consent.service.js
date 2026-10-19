const prisma = require('../../config/prisma');
const { ApiError } = require('../../errors');
const { logActivity } = require('../../utils/activityLogger');

class ConsentService {
  /**
   * Check if user is authorized to access this contact
   */
  async verifyContactAccess(contactId, user) {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: { department: true },
    });

    if (!contact || contact.deletedAt) {
      throw new ApiError(404, 'Contact not found');
    }

    const userRole = typeof user.role === 'string' ? user.role : user.role?.name;
    const isGlobal = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    if (!isGlobal && contact.departmentId) {
      const allowed = (user.departments || []).some((d) => (d.id || d.departmentId) === contact.departmentId);
      if (!allowed && contact.ownerId !== user.id) {
        throw new ApiError(403, 'Forbidden: Contact belongs to an unauthorized department');
      }
    }

    return contact;
  }

  /**
   * Record documented affirmative opt-in or revocation
   */
  async recordConsent(contactId, data, actorUser) {
    const contact = await this.verifyContactAccess(contactId, actorUser);
    const { status, source, proof, notes } = data;

    const isRevoked = status === 'REVOKED';
    const isGranted = status === 'GRANTED';

    const [updatedContact, consentRecord] = await prisma.$transaction([
      prisma.contact.update({
        where: { id: contactId },
        data: {
          consentStatus: status,
          isOptedOut: isRevoked,
          optOutAt: isRevoked ? new Date() : isGranted ? null : contact.optOutAt,
          updatedAt: new Date(),
        },
      }),
      prisma.consent.create({
        data: {
          contactId,
          status,
          source: source || 'MANUAL_STAFF',
          marketingEligible: isGranted,
          optOutAt: isRevoked ? new Date() : null,
          proof: proof || null,
          notes: notes || null,
          actorId: actorUser.id,
        },
        include: {
          actor: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
    ]);

    await logActivity({
      actorId: actorUser.id,
      action: isRevoked ? 'CONSENT_REVOKED' : 'CONSENT_GRANTED',
      entityType: 'CONTACT',
      entityId: contactId,
      contactId,
      description: `Marketing consent set to "${status}" via source "${source || 'MANUAL_STAFF'}"`,
    });

    return {
      contact: {
        id: updatedContact.id,
        phone: updatedContact.phone,
        waId: updatedContact.waId,
        consentStatus: updatedContact.consentStatus,
        isOptedOut: updatedContact.isOptedOut,
        optOutAt: updatedContact.optOutAt,
      },
      consent: consentRecord,
    };
  }

  /**
   * Get current consent status and latest consent record
   */
  async getConsentStatus(contactId, user) {
    const contact = await this.verifyContactAccess(contactId, user);

    const latestConsent = await prisma.consent.findFirst({
      where: { contactId },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return {
      contactId: contact.id,
      phone: contact.phone,
      waId: contact.waId,
      consentStatus: contact.consentStatus,
      isOptedOut: contact.isOptedOut,
      optOutAt: contact.optOutAt,
      isMarketingEligible: contact.consentStatus === 'GRANTED' && !contact.isOptedOut,
      latestConsent,
    };
  }

  /**
   * Full chronological consent audit trail
   */
  async getConsentHistory(contactId, user) {
    await this.verifyContactAccess(contactId, user);

    const history = await prisma.consent.findMany({
      where: { contactId },
      include: {
        actor: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return history;
  }

  /**
   * Global list of consent events
   */
  async list(query = {}, user = {}) {
    const { page = 1, limit = 20, status } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (status) {
      where.status = status;
    }

    const userRole = typeof user.role === 'string' ? user.role : user.role?.name;
    const isGlobal = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    if (!isGlobal) {
      const userDeptIds = (user.departments || []).map((d) => d.id || d.departmentId).filter(Boolean);
      where.contact = {
        departmentId: { in: userDeptIds },
      };
    }

    const [total, items] = await Promise.all([
      prisma.consent.count({ where }),
      prisma.consent.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          contact: {
            select: { id: true, firstName: true, lastName: true, phone: true, waId: true, company: true },
          },
          actor: {
            select: { id: true, firstName: true, lastName: true, email: true },
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
}

module.exports = new ConsentService();

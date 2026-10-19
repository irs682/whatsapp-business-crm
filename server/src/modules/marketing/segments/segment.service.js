const prisma = require('../../../config/prisma');
const { ApiError } = require('../../../errors');
const { logActivity } = require('../../../utils/activityLogger');

class SegmentService {
  /**
   * Translates filter criteria into Prisma where clause for contacts
   */
  buildContactQuery(filters = {}, user = {}, enforceConsent = true) {
    const where = {
      deletedAt: null,
    };

    // Department Isolation: if user is not ADMIN / SUPER_ADMIN, scope to user's assigned departments
    const userRole = typeof user.role === 'string' ? user.role : user.role?.name;
    const isGlobal = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

    if (!isGlobal) {
      const userDeptIds = (user.departments || []).map((d) => d.id || d.departmentId).filter(Boolean);
      if (userDeptIds.length > 0) {
        where.departmentId = { in: userDeptIds };
      } else {
        where.ownerId = user.id;
      }
    } else if (filters.departmentId) {
      where.departmentId = filters.departmentId;
    }

    // Owner filter
    if (filters.ownerId) {
      where.ownerId = filters.ownerId;
    }

    // Tag filtering
    if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    // Source filtering
    if (filters.sources && Array.isArray(filters.sources) && filters.sources.length > 0) {
      where.source = { in: filters.sources };
    }

    // Lead stage filtering
    if (filters.leadStages && Array.isArray(filters.leadStages) && filters.leadStages.length > 0) {
      where.leads = {
        some: {
          stage: { in: filters.leadStages },
          deletedAt: null,
        },
      };
    }

    // Date filters
    if (filters.createdAfter || filters.createdBefore) {
      where.createdAt = {};
      if (filters.createdAfter) where.createdAt.gte = new Date(filters.createdAfter);
      if (filters.createdBefore) where.createdAt.lte = new Date(filters.createdBefore);
    }

    // Marketing Consent & Suppression enforcement
    if (enforceConsent) {
      if (filters.consentOnly !== false) {
        where.consentStatus = 'GRANTED';
      }
      if (filters.isOptedOut !== true) {
        where.isOptedOut = false;
      }
    }

    return where;
  }

  /**
   * Preview estimated audience size and inspect eligible contact samples
   */
  async preview(filters = {}, user = {}, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    // 1. General audience query (without consent filter)
    const baseWhere = this.buildContactQuery(filters, user, false);
    const totalAudience = await prisma.contact.count({ where: baseWhere });

    // 2. Eligible audience query (strictly requiring valid opt-in and not opted-out)
    const eligibleWhere = this.buildContactQuery(filters, user, true);
    const eligibleCount = await prisma.contact.count({ where: eligibleWhere });
    const suppressedCount = Math.max(0, totalAudience - eligibleCount);

    // 3. Paginated eligible sample
    const sampleContacts = await prisma.contact.findMany({
      where: eligibleWhere,
      skip,
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        waId: true,
        email: true,
        company: true,
        tags: true,
        consentStatus: true,
        isOptedOut: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      totalAudience,
      eligibleCount,
      suppressedCount,
      page,
      limit,
      totalPages: Math.ceil(eligibleCount / limit) || 1,
      sampleContacts,
    };
  }

  /**
   * Save a new audience segment definition
   */
  async create(data, user) {
    const { name, description, departmentId, filters } = data;

    // Verify department access
    const userRole = typeof user.role === 'string' ? user.role : user.role?.name;
    const isGlobal = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    if (!isGlobal && departmentId) {
      const allowed = (user.departments || []).some((d) => (d.id || d.departmentId) === departmentId);
      if (!allowed) {
        throw new ApiError(403, 'Unauthorized: Cannot create segment for inaccessible department');
      }
    }

    const segment = await prisma.marketingSegment.create({
      data: {
        name,
        description,
        departmentId: departmentId || (user.departments?.[0]?.id || user.departments?.[0]?.departmentId || null),
        createdById: user.id,
        filters: filters || { consentOnly: true, isOptedOut: false },
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        department: {
          select: { id: true, name: true },
        },
      },
    });

    await logActivity({
      actorId: user.id,
      action: 'CREATE_SEGMENT',
      entityType: 'MARKETING_SEGMENT',
      entityId: segment.id,
      description: `Created audience segment "${segment.name}"`,
    });

    return segment;
  }

  /**
   * List saved segments with authorization scoping
   */
  async list(query = {}, user = {}) {
    const { page = 1, limit = 20, search } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      isArchived: false,
      deletedAt: null,
    };

    const userRole = typeof user.role === 'string' ? user.role : user.role?.name;
    const isGlobal = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    if (!isGlobal) {
      const userDeptIds = (user.departments || []).map((d) => d.id || d.departmentId).filter(Boolean);
      where.OR = [
        { departmentId: { in: userDeptIds } },
        { createdById: user.id },
      ];
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [total, items] = await Promise.all([
      prisma.marketingSegment.count({ where }),
      prisma.marketingSegment.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          department: { select: { id: true, name: true } },
          _count: { select: { campaigns: true } },
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
   * Retrieve single segment by ID
   */
  async getById(id, user) {
    const segment = await prisma.marketingSegment.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        department: { select: { id: true, name: true } },
      },
    });

    if (!segment || segment.deletedAt) {
      throw new ApiError(404, 'Audience segment not found');
    }

    // Check department access
    const userRole = typeof user.role === 'string' ? user.role : user.role?.name;
    const isGlobal = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    if (!isGlobal && segment.departmentId) {
      const allowed = (user.departments || []).some((d) => (d.id || d.departmentId) === segment.departmentId);
      if (!allowed && segment.createdById !== user.id) {
        throw new ApiError(403, 'Forbidden: Inaccessible department segment');
      }
    }

    return segment;
  }

  /**
   * Update segment
   */
  async update(id, data, user) {
    await this.getById(id, user);

    const updated = await prisma.marketingSegment.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Archive / soft-delete segment
   */
  async delete(id, user) {
    await this.getById(id, user);

    await prisma.marketingSegment.update({
      where: { id },
      data: { isArchived: true, deletedAt: new Date() },
    });

    return { message: 'Audience segment archived successfully' };
  }
}

module.exports = new SegmentService();

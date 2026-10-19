const prisma = require('../../config/prisma');
const ROLES = require('../../constants/roles');
const { ForbiddenError, NotFoundError } = require('../../errors');
const { logAudit } = require('../../utils/auditLogger');

class AuditService {
  /**
   * List paginated audit logs with filters and department isolation
   */
  async list(query = {}, user) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const where = {};

    // 1. Department isolation
    if (user.role !== ROLES.SUPER_ADMIN && user.role !== ROLES.ADMIN) {
      const userDeptIds = (user.departments || []).map((d) => d.departmentId || d.id);
      if (userDeptIds.length > 0) {
        where.OR = [
          { departmentId: { in: userDeptIds } },
          { actorId: user.id },
        ];
      } else {
        where.actorId = user.id;
      }
    } else if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    // 2. Exact match filters
    if (query.actorId) {
      where.actorId = query.actorId;
    }
    if (query.action) {
      where.action = query.action.toUpperCase();
    }
    if (query.entity) {
      where.entity = query.entity.toUpperCase();
    }
    if (query.correlationId) {
      where.correlationId = query.correlationId;
    }

    // 3. Date range filter
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        const start = new Date(query.startDate);
        if (!isNaN(start.getTime())) where.createdAt.gte = start;
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        if (!isNaN(end.getTime())) {
          // If YYYY-MM-DD, set to 23:59:59.999Z
          if (query.endDate.length <= 10) {
            end.setUTCHours(23, 59, 59, 999);
          }
          where.createdAt.lte = end;
        }
      }
    }

    // 4. Free-text search on action / entity / ipAddress
    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        ...(where.OR || []),
        { action: { contains: s, mode: 'insensitive' } },
        { entity: { contains: s, mode: 'insensitive' } },
        { ipAddress: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get single audit record by ID
   */
  async findById(id, user) {
    const item = await prisma.auditLog.findUnique({
      where: { id },
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundError('Audit log entry not found');
    }

    // Department authorization check
    if (user.role !== ROLES.SUPER_ADMIN && user.role !== ROLES.ADMIN) {
      const userDeptIds = (user.departments || []).map((d) => d.departmentId || d.id);
      const isActor = item.actorId === user.id;
      const isSameDept = item.departmentId && userDeptIds.includes(item.departmentId);

      if (!isActor && !isSameDept) {
        throw new ForbiddenError('You do not have permission to view this audit log entry');
      }
    }

    return item;
  }

  /**
   * Export audit logs to secure CSV
   */
  async exportCsv(query = {}, user, clientIp = null) {
    // Max 5000 records for memory safety
    const listResult = await this.list({ ...query, page: 1, limit: 5000 }, user);
    const logs = listResult.items;

    const sanitizeCell = (val) => {
      if (val === null || val === undefined) return '""';
      let str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      str = str.replace(/"/g, '""');
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
      }
      return `"${str}"`;
    };

    const headers = [
      'ID',
      'Timestamp',
      'Action',
      'Entity',
      'Entity ID',
      'Actor Name',
      'Actor Email',
      'Department',
      'IP Address',
      'Correlation ID',
    ];

    let csvContent = headers.map(sanitizeCell).join(',') + '\n';

    for (const log of logs) {
      const actorName = log.actor ? `${log.actor.firstName || ''} ${log.actor.lastName || ''}`.trim() : 'System';
      const row = [
        log.id,
        log.createdAt.toISOString(),
        log.action,
        log.entity,
        log.entityId || '',
        actorName,
        log.actor?.email || '',
        log.department?.name || '',
        log.ipAddress || '',
        log.correlationId || '',
      ];
      csvContent += row.map(sanitizeCell).join(',') + '\n';
    }

    await logAudit({
      actorId: user.id,
      action: 'AUDIT_LOG_EXPORTED',
      entity: 'AUDIT_LOG',
      entityId: 'EXPORT',
      departmentId: user.departments?.[0]?.id || null,
      metadata: {
        query,
        count: logs.length,
      },
      ipAddress: clientIp,
    });

    return {
      filename: `audit_logs_${Date.now()}.csv`,
      contentType: 'text/csv; charset=utf-8',
      data: csvContent,
    };
  }
}

module.exports = new AuditService();

const { z } = require('zod');
const { ForbiddenError, BadRequestError } = require('../../errors');

const reportQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  status: z.string().optional(),
  stage: z.string().optional(),
  source: z.string().optional(),
  priority: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  page: z.coerce.number().min(1).optional().default(1),
  exportFormat: z.enum(['csv', 'json']).optional().default('csv'),
});

/**
 * Normalizes UTC reporting boundaries and verifies department authorization.
 */
function parseReportFilters(query, user) {
  const validated = reportQuerySchema.parse(query);
  const now = new Date();

  // Default to past 30 days if not explicitly provided
  let start = validated.startDate
    ? new Date(validated.startDate)
    : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  let end = validated.endDate
    ? new Date(validated.endDate)
    : new Date(now.getTime());

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new BadRequestError('Invalid date format provided for reporting window. Expected ISO 8601 string.');
  }

  // Ensure start <= end
  if (start > end) {
    const tmp = start;
    start = end;
    end = tmp;
  }

  // Set inclusive start (00:00:00.000) and end (23:59:59.999) if only date was given
  if (validated.startDate && validated.startDate.length === 10) {
    start.setUTCHours(0, 0, 0, 0);
  }
  if (validated.endDate && validated.endDate.length === 10) {
    end.setUTCHours(23, 59, 59, 999);
  }

  // Calculate prior comparative period of equivalent duration
  const durationMs = end.getTime() - start.getTime();
  const priorStart = new Date(start.getTime() - durationMs);
  const priorEnd = new Date(start.getTime() - 1);

  // Department-Level Access Scoping
  const userRole = typeof user.role === 'string' ? user.role : user.role?.name;
  const isGlobal = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
  const userDeptIds = (user.departments || []).map((d) => d.id || d.departmentId).filter(Boolean);

  let targetDepartmentId = validated.departmentId || null;
  let targetDepartmentIds = null;

  if (!isGlobal) {
    if (targetDepartmentId) {
      if (!userDeptIds.includes(targetDepartmentId)) {
        throw new ForbiddenError('Unauthorized: You cannot access reporting for an unassigned department');
      }
      targetDepartmentIds = [targetDepartmentId];
    } else {
      targetDepartmentIds = userDeptIds.length > 0 ? userDeptIds : ['__NONE__'];
    }
  } else if (targetDepartmentId) {
    targetDepartmentIds = [targetDepartmentId];
  }

  return {
    ...validated,
    start,
    end,
    priorStart,
    priorEnd,
    durationMs,
    targetDepartmentId,
    targetDepartmentIds,
    isGlobal,
  };
}

module.exports = {
  reportQuerySchema,
  parseReportFilters,
};

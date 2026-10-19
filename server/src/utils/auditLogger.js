const prisma = require('../config/prisma');

/**
 * Enterprise Audit Trail Logger
 * Securely records administrative, configuration, authorization, export, and governance events.
 */
async function logAudit({
  actorId = null,
  action,
  entity,
  entityId = null,
  departmentId = null,
  correlationId = null,
  previousState = null,
  newState = null,
  metadata = null,
  ipAddress = null,
  userAgent = null,
}) {
  try {
    const sanitize = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(sanitize);
      const clean = {};
      for (const [k, v] of Object.entries(obj)) {
        if (/password|passwordhash|token|secret|jwt|apikey|authorization/i.test(k)) {
          clean[k] = '[REDACTED]';
        } else if (v && typeof v === 'object') {
          clean[k] = sanitize(v);
        } else {
          clean[k] = v;
        }
      }
      return clean;
    };

    return await prisma.auditLog.create({
      data: {
        actorId,
        action,
        entity,
        entityId,
        departmentId,
        correlationId,
        previousState: sanitize(previousState),
        newState: sanitize(newState),
        metadata: sanitize(metadata),
        ipAddress: ipAddress ? String(ipAddress).slice(0, 100) : null,
        userAgent: userAgent ? String(userAgent).slice(0, 255) : null,
      },
    });
  } catch (err) {
    console.error('[AuditLogger] Non-blocking audit log error:', err.message);
    return null;
  }
}

module.exports = {
  logAudit,
};

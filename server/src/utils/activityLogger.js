const prisma = require('../config/prisma');

/**
 * Customer Interaction Activity Logger
 * Logs lifecycle events associated with Contacts and Leads
 */
async function logActivity({
  actorId = null,
  action,
  entityType,
  entityId,
  contactId = null,
  leadId = null,
  description = null,
  metadata = null,
}) {
  try {
    // Sanitize metadata: Remove sensitive fields if present
    let safeMetadata = null;
    if (metadata && typeof metadata === 'object') {
      const { password, token, passwordHash, secret, ...safe } = metadata;
      safeMetadata = safe;
    }

    return await prisma.activityLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        contactId,
        leadId,
        description,
        metadata: safeMetadata,
      },
    });
  } catch (err) {
    // Activity logging should not fail the primary business transaction
    console.error('[ActivityLogger] Error logging customer activity:', err);
    return null;
  }
}

module.exports = {
  logActivity,
};

const PERMISSIONS = {
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',

  DEPARTMENTS_READ: 'departments:read',
  DEPARTMENTS_CREATE: 'departments:create',
  DEPARTMENTS_UPDATE: 'departments:update',
  DEPARTMENTS_DELETE: 'departments:delete',

  CONTACTS_READ: 'contacts:read',
  CONTACTS_CREATE: 'contacts:create',
  CONTACTS_UPDATE: 'contacts:update',
  CONTACTS_DELETE: 'contacts:delete',

  LEADS_READ: 'leads:read',
  LEADS_CREATE: 'leads:create',
  LEADS_UPDATE: 'leads:update',
  LEADS_DELETE: 'leads:delete',

  CONVERSATIONS_READ: 'conversations:read',
  CONVERSATIONS_REPLY: 'conversations:reply',
  CONVERSATIONS_ASSIGN: 'conversations:assign',
  CONVERSATIONS_CLOSE: 'conversations:close',

  CAMPAIGNS_READ: 'campaigns:read',
  CAMPAIGNS_CREATE: 'campaigns:create',
  CAMPAIGNS_APPROVE: 'campaigns:approve',

  REPORTS_READ: 'reports:read',
  AUDIT_READ: 'audit:read',
};

module.exports = PERMISSIONS;

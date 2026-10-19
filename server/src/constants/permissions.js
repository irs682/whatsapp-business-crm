const PERMISSIONS = {
  // Users
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',

  // Departments
  DEPARTMENTS_READ: 'departments:read',
  DEPARTMENTS_CREATE: 'departments:create',
  DEPARTMENTS_UPDATE: 'departments:update',
  DEPARTMENTS_DELETE: 'departments:delete',

  // Contacts
  CONTACTS_READ: 'contacts:read',
  CONTACTS_CREATE: 'contacts:create',
  CONTACTS_UPDATE: 'contacts:update',
  CONTACTS_DELETE: 'contacts:delete',

  // Tags
  TAGS_READ: 'tags:read',
  TAGS_MANAGE: 'tags:manage',

  // Leads
  LEADS_READ: 'leads:read',
  LEADS_CREATE: 'leads:create',
  LEADS_UPDATE: 'leads:update',
  LEADS_DELETE: 'leads:delete',

  // Notes
  NOTES_READ: 'notes:read',
  NOTES_CREATE: 'notes:create',
  NOTES_DELETE: 'notes:delete',

  // Tasks
  TASKS_READ: 'tasks:read',
  TASKS_CREATE: 'tasks:create',
  TASKS_UPDATE: 'tasks:update',
  TASKS_DELETE: 'tasks:delete',

  // Dashboard & Metrics
  DASHBOARD_READ: 'dashboard:read',

  // Conversations
  CONVERSATIONS_READ: 'conversations:read',
  CONVERSATIONS_REPLY: 'conversations:reply',
  CONVERSATIONS_ASSIGN: 'conversations:assign',
  CONVERSATIONS_CLOSE: 'conversations:close',

  // Marketing & Campaigns
  CAMPAIGNS_READ: 'campaigns:read',
  CAMPAIGNS_CREATE: 'campaigns:create',
  CAMPAIGNS_APPROVE: 'campaigns:approve',

  // Reports & Audits
  REPORTS_READ: 'reports:read',
  AUDIT_READ: 'audit:read',
};

module.exports = PERMISSIONS;

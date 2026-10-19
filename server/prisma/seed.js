const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SECURITY VIOLATION: Refusing to seed default test credentials in production environment.');
  }

  console.log('🌱 Starting database seed...');

  // 1. Predefined Roles
  const rolesData = [
    { name: 'SUPER_ADMIN', description: 'Full system access and tenant management', isSystem: true },
    { name: 'ADMIN', description: 'Administrative access across all CRM modules', isSystem: true },
    { name: 'MANAGER', description: 'Department manager with team reporting and campaign permissions', isSystem: true },
    { name: 'AGENT', description: 'Support/Sales representative handling conversations and contacts', isSystem: true },
  ];

  const roleMap = {};
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: r,
    });
    roleMap[r.name] = role;
    console.log(`  Role ready: ${r.name}`);
  }

  // 2. Predefined Permissions
  const permissionsData = [
    // Users
    { slug: 'users:read', name: 'View Users', module: 'users', description: 'Can view user list and profiles' },
    { slug: 'users:create', name: 'Create Users', module: 'users', description: 'Can invite or create users' },
    { slug: 'users:update', name: 'Update Users', module: 'users', description: 'Can edit user details and assignments' },
    { slug: 'users:delete', name: 'Delete Users', module: 'users', description: 'Can soft delete or deactivate users' },
    // Departments
    { slug: 'departments:read', name: 'View Departments', module: 'departments', description: 'Can view department list' },
    { slug: 'departments:create', name: 'Create Departments', module: 'departments', description: 'Can create departments' },
    { slug: 'departments:update', name: 'Update Departments', module: 'departments', description: 'Can update departments' },
    { slug: 'departments:delete', name: 'Delete Departments', module: 'departments', description: 'Can remove departments' },
    // Contacts
    { slug: 'contacts:read', name: 'View Contacts', module: 'contacts', description: 'Can view CRM contacts' },
    { slug: 'contacts:create', name: 'Create Contacts', module: 'contacts', description: 'Can create new contacts' },
    { slug: 'contacts:update', name: 'Update Contacts', module: 'contacts', description: 'Can update contact information' },
    { slug: 'contacts:delete', name: 'Delete Contacts', module: 'contacts', description: 'Can archive or remove contacts' },
    // Tags
    { slug: 'tags:read', name: 'View Tags', module: 'tags', description: 'Can view contact tags' },
    { slug: 'tags:manage', name: 'Manage Tags', module: 'tags', description: 'Can create, edit and delete contact tags' },
    // Leads
    { slug: 'leads:read', name: 'View Leads', module: 'leads', description: 'Can view lead pipelines' },
    { slug: 'leads:create', name: 'Create Leads', module: 'leads', description: 'Can create leads' },
    { slug: 'leads:update', name: 'Update Leads', module: 'leads', description: 'Can advance lead stages and values' },
    { slug: 'leads:delete', name: 'Delete Leads', module: 'leads', description: 'Can delete leads' },
    // Notes
    { slug: 'notes:read', name: 'View Notes', module: 'notes', description: 'Can view internal notes' },
    { slug: 'notes:create', name: 'Create Notes', module: 'notes', description: 'Can add internal notes' },
    { slug: 'notes:delete', name: 'Delete Notes', module: 'notes', description: 'Can delete internal notes' },
    // Tasks
    { slug: 'tasks:read', name: 'View Tasks', module: 'tasks', description: 'Can view follow-up tasks' },
    { slug: 'tasks:create', name: 'Create Tasks', module: 'tasks', description: 'Can create follow-up tasks' },
    { slug: 'tasks:update', name: 'Update Tasks', module: 'tasks', description: 'Can edit and complete follow-up tasks' },
    { slug: 'tasks:delete', name: 'Delete Tasks', module: 'tasks', description: 'Can delete follow-up tasks' },
    // Dashboard
    { slug: 'dashboard:read', name: 'View Dashboard', module: 'dashboard', description: 'Can view operational dashboard metrics' },
    // Conversations
    { slug: 'conversations:read', name: 'View Conversations', module: 'conversations', description: 'Can view customer conversations' },
    { slug: 'conversations:reply', name: 'Reply Messages', module: 'conversations', description: 'Can send messages to customers' },
    { slug: 'conversations:assign', name: 'Assign Conversations', module: 'conversations', description: 'Can assign conversations to agents' },
    { slug: 'conversations:transfer', name: 'Transfer Conversations', module: 'conversations', description: 'Can transfer chats between departments' },
    { slug: 'conversations:close', name: 'Close Conversations', module: 'conversations', description: 'Can resolve or close chats' },
    // Quick Replies
    { slug: 'quick_replies:read', name: 'View Quick Replies', module: 'quick_replies', description: 'Can view and search quick reply templates' },
    { slug: 'quick_replies:manage', name: 'Manage Quick Replies', module: 'quick_replies', description: 'Can create and edit quick reply templates' },
    // Campaigns
    { slug: 'campaigns:read', name: 'View Campaigns', module: 'campaigns', description: 'Can view marketing campaigns' },
    { slug: 'campaigns:create', name: 'Create Campaigns', module: 'campaigns', description: 'Can build draft campaigns' },
    { slug: 'campaigns:approve', name: 'Approve Campaigns', module: 'campaigns', description: 'Can approve campaigns for broadcast' },
    // Reports & Audit
    { slug: 'reports:read', name: 'View Reports', module: 'reports', description: 'Can view analytics and performance' },
    { slug: 'audit:read', name: 'View Audit Logs', module: 'audit', description: 'Can view system audit trail' },
  ];

  const permissionRecords = [];
  for (const p of permissionsData) {
    const perm = await prisma.permission.upsert({
      where: { slug: p.slug },
      update: { name: p.name, module: p.module, description: p.description },
      create: p,
    });
    permissionRecords.push(perm);
  }
  console.log(`  Permissions synced: ${permissionRecords.length} permissions.`);

  // 3. Link Permissions to Roles
  for (const perm of permissionRecords) {
    // SUPER_ADMIN and ADMIN get all permissions
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: roleMap.SUPER_ADMIN.id, permissionId: perm.id } },
      update: {},
      create: { roleId: roleMap.SUPER_ADMIN.id, permissionId: perm.id },
    });
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: roleMap.ADMIN.id, permissionId: perm.id } },
      update: {},
      create: { roleId: roleMap.ADMIN.id, permissionId: perm.id },
    });

    // MANAGER permissions
    if (
      [
        'users:read', 'departments:read',
        'contacts:read', 'contacts:create', 'contacts:update',
        'tags:read', 'tags:manage',
        'leads:read', 'leads:create', 'leads:update',
        'notes:read', 'notes:create', 'notes:delete',
        'tasks:read', 'tasks:create', 'tasks:update', 'tasks:delete',
        'dashboard:read',
        'conversations:read', 'conversations:reply', 'conversations:assign', 'conversations:close',
        'campaigns:read', 'campaigns:create', 'campaigns:approve',
        'reports:read', 'audit:read'
      ].includes(perm.slug)
    ) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: roleMap.MANAGER.id, permissionId: perm.id } },
        update: {},
        create: { roleId: roleMap.MANAGER.id, permissionId: perm.id },
      });
    }

    // AGENT permissions
    if (
      [
        'contacts:read', 'contacts:create', 'contacts:update',
        'tags:read',
        'leads:read', 'leads:create', 'leads:update',
        'notes:read', 'notes:create',
        'tasks:read', 'tasks:create', 'tasks:update',
        'dashboard:read',
        'conversations:read', 'conversations:reply', 'conversations:assign', 'conversations:transfer', 'conversations:close',
        'quick_replies:read'
      ].includes(perm.slug)
    ) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: roleMap.AGENT.id, permissionId: perm.id } },
        update: {},
        create: { roleId: roleMap.AGENT.id, permissionId: perm.id },
      });
    }
  }
  console.log('  Role-Permission matrix configured.');

  // 4. Default Departments
  const deptData = [
    { name: 'Customer Support', description: 'General client assistance and dispute handling' },
    { name: 'Sales & Inquiries', description: 'Inbound sales inquiries and lead qualification' },
    { name: 'Billing & Finance', description: 'Payment verification and invoicing' },
  ];

  const depts = [];
  for (const d of deptData) {
    const dept = await prisma.department.upsert({
      where: { name: d.name },
      update: { description: d.description },
      create: d,
    });
    depts.push(dept);
    console.log(`  Department ready: ${dept.name}`);
  }

  // 5. Default Super Admin User
  const adminEmail = 'admin@crm.local';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Admin123!', salt);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      roleId: roleMap.SUPER_ADMIN.id,
      firstName: 'System',
      lastName: 'Administrator',
    },
    create: {
      email: adminEmail,
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      phone: '+10000000000',
      roleId: roleMap.SUPER_ADMIN.id,
      status: 'ACTIVE',
    },
  });
  console.log(`  Initial Admin created: ${adminUser.email} (Password: Admin123!)`);

  // Assign Admin to primary Support department
  if (depts[0]) {
    await prisma.userDepartment.upsert({
      where: { userId_departmentId: { userId: adminUser.id, departmentId: depts[0].id } },
      update: { isPrimary: true },
      create: { userId: adminUser.id, departmentId: depts[0].id, isPrimary: true },
    });
  }

  // 6. Default Support Agent User
  const agentEmail = 'agent@crm.local';
  const agentPasswordHash = await bcrypt.hash('Agent123!', salt);
  const agentUser = await prisma.user.upsert({
    where: { email: agentEmail },
    update: {
      roleId: roleMap.AGENT.id,
      firstName: 'Alex',
      lastName: 'Agent',
    },
    create: {
      email: agentEmail,
      passwordHash: agentPasswordHash,
      firstName: 'Alex',
      lastName: 'Agent',
      phone: '+10000000002',
      roleId: roleMap.AGENT.id,
      status: 'ACTIVE',
    },
  });
  console.log(`  Agent created: ${agentUser.email} (Password: Agent123!)`);

  if (depts[0]) {
    await prisma.userDepartment.upsert({
      where: { userId_departmentId: { userId: agentUser.id, departmentId: depts[0].id } },
      update: { isPrimary: true },
      create: { userId: agentUser.id, departmentId: depts[0].id, isPrimary: true },
    });
  }

  // 7. Seed Default Contact Tags
  const defaultTags = [
    { name: 'VIP', color: '#8b5cf6', description: 'High-value enterprise customer' },
    { name: 'Prospect', color: '#3b82f6', description: 'Potential lead evaluating solutions' },
    { name: 'Customer', color: '#10b981', description: 'Active paying client' },
    { name: 'Support', color: '#f59e0b', description: 'Technical inquiry in progress' },
    { name: 'Partner', color: '#ec4899', description: 'Channel and integration partner' },
  ];

  for (const tag of defaultTags) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: { color: tag.color, description: tag.description },
      create: tag,
    });
  }
  console.log(`  Tags synced: ${defaultTags.length} default tags.`);

  // 8. Seed Default Lead Pipeline Stages
  const defaultStages = [
    { name: 'NEW', order: 1, color: '#3b82f6', isDefault: true },
    { name: 'CONTACTED', order: 2, color: '#06b6d4', isDefault: false },
    { name: 'QUALIFIED', order: 3, color: '#10b981', isDefault: false },
    { name: 'WON', order: 4, color: '#059669', isDefault: false },
    { name: 'LOST', order: 5, color: '#ef4444', isDefault: false },
  ];

  for (const stage of defaultStages) {
    await prisma.leadPipelineStage.upsert({
      where: { name: stage.name },
      update: { order: stage.order, color: stage.color, isDefault: stage.isDefault },
      create: stage,
    });
  }
  // 9. Default Quick Replies
  const defaultQuickReplies = [
    {
      title: 'Support Greeting',
      shortcut: '/hello',
      content: 'Hello! Thank you for contacting Stech Solutions support. How may I assist you today?',
    },
    {
      title: 'Pricing & Tiers Inquiry',
      shortcut: '/pricing',
      content: 'Our WhatsApp Business CRM offers Standard, Pro, and Enterprise tiers. You can review all plan inclusions or schedule a 1-on-1 walkthrough with our solutions specialist.',
    },
    {
      title: 'Transfer Notice',
      shortcut: '/transfer',
      content: 'I am transferring your enquiry to our specialized department who will assist you immediately. Please hold for just a moment.',
    },
    {
      title: 'Resolution Confirmation',
      shortcut: '/resolved',
      content: 'Thank you for choosing Stech Solutions. We have marked this inquiry as resolved. Feel free to message us again if you have any further questions!',
    },
  ];

  for (const qr of defaultQuickReplies) {
    await prisma.quickReply.upsert({
      where: { shortcut: qr.shortcut },
      update: { title: qr.title, content: qr.content },
      create: {
        ...qr,
        createdById: adminUser.id,
      },
    });
  }
  console.log(`  Quick Replies synced: ${defaultQuickReplies.length} templates.`);

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

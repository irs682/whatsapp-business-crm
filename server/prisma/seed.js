const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
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
    // Leads
    { slug: 'leads:read', name: 'View Leads', module: 'leads', description: 'Can view lead pipelines' },
    { slug: 'leads:create', name: 'Create Leads', module: 'leads', description: 'Can create leads' },
    { slug: 'leads:update', name: 'Update Leads', module: 'leads', description: 'Can advance lead stages and values' },
    { slug: 'leads:delete', name: 'Delete Leads', module: 'leads', description: 'Can delete leads' },
    // Conversations
    { slug: 'conversations:read', name: 'View Conversations', module: 'conversations', description: 'Can view customer conversations' },
    { slug: 'conversations:reply', name: 'Reply Messages', module: 'conversations', description: 'Can send messages to customers' },
    { slug: 'conversations:assign', name: 'Assign Conversations', module: 'conversations', description: 'Can assign conversations to agents' },
    { slug: 'conversations:close', name: 'Close Conversations', module: 'conversations', description: 'Can resolve or close chats' },
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

    // AGENT permissions
    if (
      ['contacts:read', 'contacts:create', 'contacts:update', 'leads:read', 'leads:create', 'leads:update', 'conversations:read', 'conversations:reply', 'conversations:close'].includes(perm.slug)
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

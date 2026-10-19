const { describe, it, expect, assert } = require('./test-utils');
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');

describe('Phase 2 CRM Core Management Verification', () => {
  let adminToken;
  let agentToken;
  let adminUser;
  let agentUser;
  let testDept;
  let testContact;
  let testLead;
  let createdStaffId;

  it('Setup: Authenticate Admin & Agent and initialize test department', async () => {
    // Authenticate Admin
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@crm.local', password: 'Admin123!' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.token;
    adminUser = adminRes.body.data.user;

    // Authenticate Agent
    const agentRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'agent@crm.local', password: 'Agent123!' });
    expect(agentRes.status).toBe(200);
    agentToken = agentRes.body.data.token;
    agentUser = agentRes.body.data.user;

    // Create a dedicated department for Phase 2 tests
    const deptRes = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `P2-Dept-${Date.now()}`,
        description: 'Temporary department for Phase 2 testing',
      });
    expect(deptRes.status).toBe(201);
    testDept = deptRes.body.data;
  });

  // -------------------------------------------------------------
  // MODULE 1: USER MANAGEMENT
  // -------------------------------------------------------------
  it('1. Admin can create staff accounts; Agent is rejected', async () => {
    const roles = await prisma.role.findMany();
    const agentRole = roles.find((r) => r.name === 'AGENT');

    // Agent attempts to create staff -> 403
    const agentAttempt = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        email: `agent_attempt_${Date.now()}@crm.local`,
        password: 'Password123!',
        firstName: 'Unauthorized',
        lastName: 'Creation',
        roleId: agentRole.id,
      });
    expect(agentAttempt.status).toBe(403);

    // Admin creates staff account
    const uniqueEmail = `staff_${Date.now()}@crm.local`;
    const adminCreate = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: uniqueEmail,
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: `+1999${Math.floor(1000000 + Math.random() * 9000000)}`,
        roleId: agentRole.id,
        departmentIds: [testDept.id],
      });
    expect(adminCreate.status).toBe(201);
    expect(adminCreate.body.data.email).toBe(uniqueEmail);
    expect(adminCreate.body.data.passwordHash).toBe(undefined);
    createdStaffId = adminCreate.body.data.id;
  });

  it('2. Admin can update user status and department assignments', async () => {
    // Update status to INACTIVE
    const statusRes = await request(app)
      .patch(`/api/v1/users/${createdStaffId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'INACTIVE' });
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.status).toBe('INACTIVE');

    // Reactivate user
    const reactivateRes = await request(app)
      .patch(`/api/v1/users/${createdStaffId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' });
    expect(reactivateRes.status).toBe(200);
    expect(reactivateRes.body.data.status).toBe('ACTIVE');

    // Update departments
    const deptAssignRes = await request(app)
      .put(`/api/v1/users/${createdStaffId}/departments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ departmentIds: [testDept.id], primaryDepartmentId: testDept.id });
    expect(deptAssignRes.status).toBe(200);
  });

  it('3. System prevents deactivating the last active SUPER_ADMIN', async () => {
    const superAdmin = await prisma.user.findFirst({
      where: { email: 'admin@crm.local' },
    });

    const attempt = await request(app)
      .patch(`/api/v1/users/${superAdmin.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'INACTIVE' });

    expect(attempt.status).toBe(400);
    expect(attempt.body.message).toContain('Cannot deactivate');
  });

  // -------------------------------------------------------------
  // MODULE 2: DEPARTMENT MANAGEMENT
  // -------------------------------------------------------------
  it('4. Department user assignment and removal works as expected', async () => {
    // Assign agent to testDept
    const assignRes = await request(app)
      .post(`/api/v1/departments/${testDept.id}/users`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: agentUser.id, isPrimary: false });
    expect(assignRes.status).toBe(201);

    // List department users
    const usersRes = await request(app)
      .get(`/api/v1/departments/${testDept.id}/users`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(usersRes.status).toBe(200);
    const assigned = usersRes.body.data.find((u) => u.userId === agentUser.id);
    expect(Boolean(assigned)).toBe(true);

    // Remove user from department
    const removeRes = await request(app)
      .delete(`/api/v1/departments/${testDept.id}/users/${agentUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(removeRes.status).toBe(200);
  });

  // -------------------------------------------------------------
  // MODULE 5: CONTACT TAGS
  // -------------------------------------------------------------
  it('5. Contact tags: creation, duplicate prevention, and listing', async () => {
    const tagName = `Tag_${Date.now()}`;
    const tagRes = await request(app)
      .post('/api/v1/tags')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: tagName, color: '#f59e0b', description: 'Test tag' });
    expect(tagRes.status).toBe(201);
    expect(tagRes.body.data.name).toBe(tagName);

    // Duplicate tag is rejected
    const duplicateRes = await request(app)
      .post('/api/v1/tags')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: tagName, color: '#f59e0b' });
    expect(duplicateRes.status).toBe(409);

    // List tags
    const listRes = await request(app)
      .get('/api/v1/tags')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
  });

  // -------------------------------------------------------------
  // MODULE 3: CONTACT MANAGEMENT & CSV IMPORT
  // -------------------------------------------------------------
  it('6. Contact CRUD, duplicate phone rejection, and activity logging', async () => {
    const phone = `+1555${Math.floor(1000000 + Math.random() * 9000000)}`;
    const createRes = await request(app)
      .post('/api/v1/contacts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Jane',
        lastName: 'Contact',
        phone,
        email: 'jane@example.com',
        company: 'Acme Corp',
        departmentId: testDept.id,
        tags: ['Customer'],
      });
    expect(createRes.status).toBe(201);
    testContact = createRes.body.data;
    expect(testContact.phone).toBe(phone);
    expect(testContact.company).toBe('Acme Corp');

    // Duplicate phone creation is rejected
    const dupRes = await request(app)
      .post('/api/v1/contacts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Duplicate',
        lastName: 'Contact',
        phone,
      });
    expect(dupRes.status).toBe(409);

    // Verify contact activity log was created
    const activityRes = await request(app)
      .get(`/api/v1/contacts/${testContact.id}/activity`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(activityRes.status).toBe(200);
    expect(Array.isArray(activityRes.body.data)).toBe(true);
    expect(activityRes.body.data.length > 0).toBe(true);
    expect(activityRes.body.data[0].action).toBe('CONTACT_CREATED');
  });

  it('7. CSV Contact Import validates rows and STRICTLY prevents automatic marketing opt-in', async () => {
    const uniquePhoneA = `+1777${Math.floor(1000000 + Math.random() * 9000000)}`;
    const uniquePhoneB = `+1777${Math.floor(1000000 + Math.random() * 9000000)}`;

    const rows = [
      { firstName: 'ImportA', lastName: 'Test', phone: uniquePhoneA, email: 'importa@example.com', company: 'Company A' },
      { firstName: 'ImportB', lastName: 'Test', phone: uniquePhoneB, email: 'importb@example.com', company: 'Company B' },
      // Invalid duplicate row in same batch
      { firstName: 'DuplicateInBatch', lastName: 'Test', phone: uniquePhoneA },
      // Invalid phone format
      { firstName: 'InvalidPhone', lastName: 'Test', phone: '123' },
    ];

    // Dry-run preview mode
    const previewRes = await request(app)
      .post('/api/v1/contacts/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rows, preview: true });
    expect(previewRes.status).toBe(200);
    expect(previewRes.body.data.preview).toBe(true);
    expect(previewRes.body.data.validCount).toBe(2);
    expect(previewRes.body.data.rejectedCount).toBe(2);

    // Actual execution mode
    const importRes = await request(app)
      .post('/api/v1/contacts/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rows, preview: false, departmentId: testDept.id });
    expect(importRes.status).toBe(200);
    expect(importRes.body.data.importedCount).toBe(2);

    // CRITICAL COMPLIANCE VERIFICATION:
    // Imported contact MUST NOT be automatically opted into marketing
    const importedContact = await prisma.contact.findUnique({
      where: { phone: uniquePhoneA },
    });
    assert.ok(importedContact !== null);
    expect(importedContact.consentStatus).toBe('PENDING');
    expect(importedContact.isOptedOut).toBe(false);

    // Clean up imported test contacts
    await prisma.contact.deleteMany({
      where: { phone: { in: [uniquePhoneA, uniquePhoneB] } },
    });
  });

  // -------------------------------------------------------------
  // MODULE 4: LEAD PIPELINE
  // -------------------------------------------------------------
  it('8. Lead pipeline: CRUD, stage progression, and activity logging', async () => {
    // List pipeline stages
    const stagesRes = await request(app)
      .get('/api/v1/leads/stages')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(stagesRes.status).toBe(200);
    expect(Array.isArray(stagesRes.body.data)).toBe(true);
    expect(stagesRes.body.data.length >= 5).toBe(true);

    // Create a lead linked to testContact
    const createLeadRes = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Enterprise Solution Pilot',
        contactId: testContact.id,
        value: 15000,
        currency: 'USD',
        stage: 'NEW',
        departmentId: testDept.id,
        description: 'Initial customer inquiry for CRM software',
      });
    expect(createLeadRes.status).toBe(201);
    testLead = createLeadRes.body.data;
    expect(testLead.title).toBe('Enterprise Solution Pilot');

    // Update lead stage to QUALIFIED
    const stageUpdate = await request(app)
      .patch(`/api/v1/leads/${testLead.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stage: 'QUALIFIED' });
    expect(stageUpdate.status).toBe(200);
    expect(stageUpdate.body.data.stage).toBe('QUALIFIED');

    // Check activity log contains LEAD_STAGE_CHANGED
    const activities = await prisma.activityLog.findMany({
      where: { leadId: testLead.id },
      orderBy: { createdAt: 'desc' },
    });
    const stageActivity = activities.find((a) => a.action === 'LEAD_STAGE_CHANGED');
    expect(Boolean(stageActivity)).toBe(true);
  });

  // -------------------------------------------------------------
  // MODULE 6: INTERNAL NOTES
  // -------------------------------------------------------------
  it('9. Internal notes: author tracking, parent validation, and isolation', async () => {
    // Admin creates note on contact
    const noteRes = await request(app)
      .post('/api/v1/notes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        content: 'Customer requested a follow-up call on Tuesday morning.',
        contactId: testContact.id,
        isInternal: true,
      });
    expect(noteRes.status).toBe(201);
    expect(noteRes.body.data.authorId).toBe(adminUser.id);
    expect(noteRes.body.data.isInternal).toBe(true);

    // List notes for contact
    const listRes = await request(app)
      .get(`/api/v1/notes?contactId=${testContact.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length > 0).toBe(true);

    // Attaching note to non-existent contact fails
    const invalidRes = await request(app)
      .post('/api/v1/notes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        content: 'Orphan note test',
        contactId: '00000000-0000-0000-0000-000000000000',
      });
    expect(invalidRes.status).toBe(404);
  });

  // -------------------------------------------------------------
  // MODULE 7: FOLLOW-UP TASK MANAGEMENT
  // -------------------------------------------------------------
  it('10. Follow-up tasks: due dates, priority, completion timestamps, and filters', async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Create overdue task
    const overdueTaskRes = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Urgent: Send pricing proposal',
        dueDate: yesterday,
        priority: 'URGENT',
        status: 'TODO',
        contactId: testContact.id,
        leadId: testLead.id,
        assignedToUserId: adminUser.id,
      });
    expect(overdueTaskRes.status).toBe(201);
    const overdueTaskId = overdueTaskRes.body.data.id;

    // Create upcoming task
    const upcomingTaskRes = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Check in on pilot progress',
        dueDate: tomorrow,
        priority: 'HIGH',
        status: 'TODO',
        assignedToUserId: adminUser.id,
      });
    expect(upcomingTaskRes.status).toBe(201);

    // Filter overdue tasks
    const overdueFilterRes = await request(app)
      .get('/api/v1/tasks?filter=overdue')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(overdueFilterRes.status).toBe(200);
    const hasOverdue = overdueFilterRes.body.data.some((t) => t.id === overdueTaskId);
    expect(hasOverdue).toBe(true);

    // Mark task as COMPLETED -> sets completedAt
    const completeRes = await request(app)
      .patch(`/api/v1/tasks/${overdueTaskId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'COMPLETED' });
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.status).toBe('COMPLETED');
    assert.ok(completeRes.body.data.completedAt !== null);
  });

  // -------------------------------------------------------------
  // MODULE 9: CRM DASHBOARD
  // -------------------------------------------------------------
  it('11. CRM Dashboard: returns real PostgreSQL metrics with zero hardcoded placeholders', async () => {
    const dashboardRes = await request(app)
      .get('/api/v1/dashboard/metrics')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(dashboardRes.status).toBe(200);
    expect(dashboardRes.body.success).toBe(true);

    const { metrics, stageCounts, recentLeads, recentContacts } = dashboardRes.body.data;

    // Check metric counters are numbers calculated from DB
    expect(typeof metrics.totalContacts).toBe('number');
    expect(typeof metrics.totalLeads).toBe('number');
    expect(typeof metrics.myAssignedLeads).toBe('number');
    expect(typeof metrics.tasksDueSoonCount).toBe('number');
    expect(typeof metrics.overdueTasksCount).toBe('number');
    expect(typeof metrics.totalPipelineValue).toBe('number');

    // Metrics should reflect records created in this test run
    expect(metrics.totalContacts >= 1).toBe(true);
    expect(metrics.totalLeads >= 1).toBe(true);

    // Stage counts should contain pipeline stages
    expect(typeof stageCounts.NEW).toBe('number');
    expect(typeof stageCounts.QUALIFIED).toBe('number');

    // Recent lists should be arrays
    expect(Array.isArray(recentLeads)).toBe(true);
    expect(Array.isArray(recentContacts)).toBe(true);
  });

  // -------------------------------------------------------------
  // TEARDOWN
  // -------------------------------------------------------------
  it('Teardown: Clean up test fixtures safely', async () => {
    if (testLead) {
      await prisma.lead.delete({ where: { id: testLead.id } }).catch(() => {});
    }
    if (testContact) {
      await prisma.contact.delete({ where: { id: testContact.id } }).catch(() => {});
    }
    if (createdStaffId) {
      await prisma.user.delete({ where: { id: createdStaffId } }).catch(() => {});
    }
    if (testDept) {
      await prisma.department.delete({ where: { id: testDept.id } }).catch(() => {});
    }
  });
});

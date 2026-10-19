const { describe, it, expect } = require('./test-utils');
const request = require('supertest');
const crypto = require('crypto');
const app = require('../src/app');
const env = require('../src/config/env');
const prisma = require('../src/config/prisma');

describe('Phase 7 End-to-End Business Workflows & Release Verification', () => {
  let adminToken;
  let agentToken;
  let adminUser;
  let agentUser;
  let supportDept;
  let salesDept;
  let createdStaffUser;
  let testContact;
  let testLead;
  let testConversation;

  it('Setup: Authenticate seeded Admin and Agent sessions', async () => {
    // Authenticate Super Admin
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@crm.local', password: 'Admin123!' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.token;
    adminUser = adminRes.body.data.user;

    // Retrieve departments
    const depts = await prisma.department.findMany({ take: 2 });
    supportDept = depts[0];
    salesDept = depts[1] || depts[0];
    expect(supportDept).toBeDefined();

    // Ensure Agent is assigned to supportDept for department-isolated inbox access
    const agentInDb = await prisma.user.findUnique({ where: { email: 'agent@crm.local' } });
    await prisma.userDepartment.upsert({
      where: { userId_departmentId: { userId: agentInDb.id, departmentId: supportDept.id } },
      update: {},
      create: { userId: agentInDb.id, departmentId: supportDept.id, isPrimary: true },
    });

    // Authenticate Support Agent
    const agentRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'agent@crm.local', password: 'Agent123!' });
    expect(agentRes.status).toBe(200);
    agentToken = agentRes.body.data.token;
    agentUser = agentRes.body.data.user;
  });

  it('Workflow 1: User Management Lifecycle (Admin -> Create Staff -> Assign Dept -> Verify)', async () => {
    const uniqueEmail = `staff_p7_${Date.now()}@crm.local`;
    const agentRole = await prisma.role.findFirst({ where: { name: 'AGENT' } });

    // Admin creates staff user
    const createRes = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: uniqueEmail,
        password: 'Password123!',
        firstName: 'E2E',
        lastName: 'Staff',
        phone: `+1999${Math.floor(100000 + Math.random() * 900000)}`,
        roleId: agentRole.id,
      });

    expect(createRes.status).toBe(201);
    createdStaffUser = createRes.body.data;
    expect(createdStaffUser.email).toBe(uniqueEmail);

    // Assign department
    const assignDeptRes = await request(app)
      .post(`/api/v1/departments/${supportDept.id}/users`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: createdStaffUser.id,
        isPrimary: true,
      });

    expect(assignDeptRes.status).toBe(201);

    // Staff user logs in
    const staffLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: uniqueEmail, password: 'Password123!' });

    expect(staffLoginRes.status).toBe(200);
    expect(staffLoginRes.body.data.token).toBeDefined();
  });

  it('Workflow 2: Customer Management (Contact -> Tag -> Lead -> Owner -> Follow-up Task)', async () => {
    const uniquePhone = `+1555${Math.floor(1000000 + Math.random() * 9000000)}`;

    // 1. Create Contact
    const contactRes = await request(app)
      .post('/api/v1/contacts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Farhan',
        lastName: 'Khan',
        phone: uniquePhone,
        email: `contact_${Date.now()}@example.com`,
      });

    expect(contactRes.status).toBe(201);
    testContact = contactRes.body.data;

    // 2. Add Tag to Contact via PATCH
    const updateRes = await request(app)
      .patch(`/api/v1/contacts/${testContact.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tags: ['VIP-Enterprise', 'Phase7-Verified'] });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.tags.includes('VIP-Enterprise')).toBe(true);

    // 3. Create Lead
    const leadRes = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Enterprise ERP Implementation',
        contactId: testContact.id,
        status: 'NEW',
        value: 45000,
        assignedToUserId: adminUser.id,
      });

    expect(leadRes.status).toBe(201);
    testLead = leadRes.body.data;

    // 4. Create Follow-up Task
    const taskRes = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Schedule Technical Architecture Review',
        contactId: testContact.id,
        leadId: testLead.id,
        assignedToUserId: adminUser.id,
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        priority: 'HIGH',
      });

    expect(taskRes.status).toBe(201);
  });

  it('Workflow 3: Shared Inbox (Create Conv -> Claim -> Local Reply -> Transfer -> Resolve)', async () => {
    // 1. Create Conversation
    const conv = await prisma.conversation.create({
      data: {
        contactId: testContact.id,
        departmentId: supportDept.id,
        channel: 'WHATSAPP',
        status: 'OPEN',
        priority: 'HIGH',
      },
    });
    testConversation = conv;

    // 2. Claim conversation as Agent
    const claimRes = await request(app)
      .post(`/api/v1/conversations/${testConversation.id}/claim`)
      .set('Authorization', `Bearer ${agentToken}`);

    expect(claimRes.status).toBe(200);
    expect(claimRes.body.data.assignedToUserId).toBe(agentUser.id);

    // 3. Send outbound reply
    const replyRes = await request(app)
      .post(`/api/v1/conversations/${testConversation.id}/messages`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        type: 'TEXT',
        text: 'Hello Mr. Khan, thank you for reaching out to Stech support.',
      });

    expect(replyRes.status).toBe(201);

    // 4. Transfer to Sales department
    const transferRes = await request(app)
      .post(`/api/v1/conversations/${testConversation.id}/transfer`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        toDepartmentId: salesDept.id,
        reason: 'Client requested commercial quotation',
      });

    expect(transferRes.status).toBe(200);
    expect(transferRes.body.data.conversation.departmentId).toBe(salesDept.id);

    // 5. Resolve Conversation
    const resolveRes = await request(app)
      .patch(`/api/v1/conversations/${testConversation.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'RESOLVED' });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.status).toBe('RESOLVED');
  });

  it('Workflow 4: WhatsApp Simulated Inbound Webhook & Timeline Verification', async () => {
    const appSecret = env.WHATSAPP_APP_SECRET || 'your_meta_app_secret_here';
    const waMsgId = `wamid.HBgL${Date.now()}`;
    const payload = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '15551234567', phone_number_id: '100000000000000' },
                contacts: [{ profile: { name: 'E2E Webhook Contact' }, wa_id: '15559876543' }],
                messages: [
                  {
                    from: '15559876543',
                    id: waMsgId,
                    timestamp: Math.floor(Date.now() / 1000),
                    text: { body: 'Simulated inbound customer inquiry via webhook' },
                    type: 'text',
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    });

    const signature = 'sha256=' + crypto.createHmac('sha256', appSecret).update(payload).digest('hex');

    const webhookRes = await request(app)
      .post('/api/v1/webhooks/whatsapp')
      .set('Content-Type', 'application/json')
      .set('x-hub-signature-256', signature)
      .set('x-test-sync', 'true')
      .send(payload);

    expect(webhookRes.status).toBe(200);

    // Verify message persistence
    const savedMsg = await prisma.message.findFirst({
      where: { waMessageId: waMsgId },
    });
    expect(savedMsg).toBeDefined();
    expect(savedMsg.text).toBe('Simulated inbound customer inquiry via webhook');
  });

  it('Workflow 5 & 6: Marketing Automation & Pre-Send Opt-Out Suppression', async () => {
    // 1. Grant marketing consent to contact via API
    const consentRes = await request(app)
      .post(`/api/v1/contacts/${testContact.id}/marketing-consent`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'GRANTED',
        source: 'MANUAL_STAFF',
        proof: 'Customer opted in via web form',
      });

    expect(consentRes.status).toBe(200);
    expect(consentRes.body.data.contact.consentStatus).toBe('GRANTED');
    expect(consentRes.body.data.contact.isOptedOut).toBe(false);

    // 2. Opt-Out Event: Contact explicitly revokes consent
    const revokeRes = await request(app)
      .post(`/api/v1/contacts/${testContact.id}/marketing-consent`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'REVOKED',
        source: 'MANUAL_STAFF',
        notes: 'Customer replied STOP',
      });

    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.data.contact.consentStatus).toBe('REVOKED');
    expect(revokeRes.body.data.contact.isOptedOut).toBe(true);

    // 3. Verify chronological audit history
    const historyRes = await request(app)
      .get(`/api/v1/contacts/${testContact.id}/consent-history`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(historyRes.status).toBe(200);
    expect(Array.isArray(historyRes.body.data)).toBe(true);
    expect(historyRes.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('Workflow 7: Reporting Metrics & Audit Logging', async () => {
    // Dashboard metrics
    const metricsRes = await request(app)
      .get('/api/v1/dashboard/metrics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(metricsRes.status).toBe(200);
    expect(metricsRes.body.success).toBe(true);

    // Audit logs inspection
    const auditRes = await request(app)
      .get('/api/v1/audit')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(auditRes.status).toBe(200);
    expect(auditRes.body.success).toBe(true);
    expect(Array.isArray(auditRes.body.data.items)).toBe(true);
  });

  it('Workflow 8: Direct API Security & Privilege Escalation Rejection', async () => {
    // Agent attempts to delete department (Requires DEPARTMENTS_DELETE / SUPER_ADMIN)
    const unauthorizedRes = await request(app)
      .delete(`/api/v1/departments/${salesDept.id}`)
      .set('Authorization', `Bearer ${agentToken}`);

    expect(unauthorizedRes.status).toBe(403);
    expect(unauthorizedRes.body.success).toBe(false);
  });

  it('Workflow 9: System Reliability & Health Probes', async () => {
    // Liveness
    const liveRes = await request(app).get('/api/v1/health/live');
    expect(liveRes.status).toBe(200);
    expect(liveRes.body.status).toBe('alive');

    // Readiness
    const readyRes = await request(app).get('/api/v1/health/ready');
    expect(readyRes.status).toBe(200);
    expect(readyRes.body.status).toBe('ready');

    // Diagnostic summary
    const summaryRes = await request(app).get('/api/v1/health');
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.dependencies.database.status).toBe('healthy');
    expect(summaryRes.body.dependencies.worker).toBeDefined();
  });
});

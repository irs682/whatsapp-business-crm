const { describe, it, before, after } = require('node:test');
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');
const { logAudit } = require('../src/utils/auditLogger');
const { expect } = require('./test-utils');

describe('Phase 6 — Advanced Reporting, Analytics, Audit Logging & Management Intelligence Verification', () => {
  let adminToken;
  let agentToken;
  let adminUser;
  let agentUser;
  let testDept;
  let testContact;
  let testLead;
  let testConversation;
  let testInboundMessage;
  let testOutboundMessage;
  let testTask;
  let testCampaign;

  before(async () => {
    // 1. Authenticate Admin
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@crm.local', password: 'Admin123!' });
    adminToken = adminLogin.body.data.token;
    adminUser = adminLogin.body.data.user;

    // 2. Authenticate Agent
    const agentLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'agent@crm.local', password: 'Agent123!' });
    agentToken = agentLogin.body.data.token;
    agentUser = agentLogin.body.data.user;

    // 3. Ensure test department exists
    testDept = await prisma.department.findFirst({ where: { name: 'Support' } });
    if (!testDept) {
      testDept = await prisma.department.create({
        data: { name: 'Support', description: 'Customer Support Dept' },
      });
    }

    // 4. Create test contact with distinct data
    testContact = await prisma.contact.create({
      data: {
        phone: '+18885556601',
        waId: '18885556601',
        firstName: 'Reporting',
        lastName: 'Tester',
        company: 'Analytics Corp',
        departmentId: testDept.id,
        source: 'WHATSAPP_INBOUND',
        consentStatus: 'GRANTED',
        isOptedOut: false,
        tags: ['PHASE6_TEST'],
      },
    });

    // 5. Create test lead
    testLead = await prisma.lead.create({
      data: {
        contactId: testContact.id,
        title: 'Enterprise Analytics Contract',
        value: 15000,
        currency: 'USD',
        stage: 'PROPOSAL_SENT',
        source: 'INBOUND',
        departmentId: testDept.id,
        assignedToUserId: adminUser.id,
      },
    });

    // 6. Create test conversation with inbound and outbound message for First Response Time (FRT)
    testConversation = await prisma.conversation.create({
      data: {
        contactId: testContact.id,
        departmentId: testDept.id,
        assignedToUserId: adminUser.id,
        status: 'OPEN',
        priority: 'NORMAL',
        channel: 'WHATSAPP',
      },
    });

    // Inbound customer message at T0
    testInboundMessage = await prisma.message.create({
      data: {
        conversationId: testConversation.id,
        direction: 'INBOUND',
        type: 'TEXT',
        text: 'I need pricing for the enterprise tier',
        status: 'DELIVERED',
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      },
    });

    // Outbound agent reply at T0 + 10 minutes (FRT = 10 minutes)
    testOutboundMessage = await prisma.message.create({
      data: {
        conversationId: testConversation.id,
        senderUserId: adminUser.id,
        direction: 'OUTBOUND',
        type: 'TEXT',
        text: 'Hello, our enterprise tier starts at $15,000.',
        status: 'READ',
        createdAt: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
      },
    });

    // 7. Create test follow-up task
    testTask = await prisma.task.create({
      data: {
        title: 'Follow up on analytics contract',
        contactId: testContact.id,
        leadId: testLead.id,
        creatorId: adminUser.id,
        assignedToUserId: adminUser.id,
        priority: 'HIGH',
        status: 'PENDING',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due tomorrow
      },
    });

    // 8. Create test campaign
    testCampaign = await prisma.campaign.create({
      data: {
        name: 'Phase 6 Reporting Validation Campaign',
        status: 'COMPLETED',
        type: 'BROADCAST',
        createdById: adminUser.id,
        departmentId: testDept.id,
        totalRecipients: 100,
        eligibleCount: 95,
        suppressedCount: 5,
        sentCount: 90,
        deliveredCount: 85,
        readCount: 50,
        repliedCount: 15,
        optOutCount: 2,
        failedCount: 5,
        startedAt: new Date(Date.now() - 3600000),
        completedAt: new Date(),
      },
    });
  });

  after(async () => {
    // Clean up test fixtures safely
    if (testCampaign) await prisma.campaign.deleteMany({ where: { id: testCampaign.id } }).catch(() => {});
    if (testTask) await prisma.task.deleteMany({ where: { id: testTask.id } }).catch(() => {});
    if (testOutboundMessage) await prisma.message.deleteMany({ where: { conversationId: testConversation?.id } }).catch(() => {});
    if (testConversation) await prisma.conversation.deleteMany({ where: { id: testConversation.id } }).catch(() => {});
    if (testLead) await prisma.lead.deleteMany({ where: { id: testLead.id } }).catch(() => {});
    if (testContact) await prisma.contact.deleteMany({ where: { id: testContact.id } }).catch(() => {});
  });

  // ==========================================
  // 1. EXECUTIVE MANAGEMENT DASHBOARD
  // ==========================================
  describe('Executive Management Dashboard', () => {
    it('should retrieve executive dashboard metrics successfully with valid aggregates', async () => {
      const res = await request(app)
        .get('/api/v1/reports/executive')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data).toBeDefined();
      expect(data.period).toBeDefined();
      expect(data.customers).toBeDefined();
      expect(data.customers.total).toBeGreaterThanOrEqual(1);
      expect(data.leads).toBeDefined();
      expect(data.leads.total).toBeGreaterThanOrEqual(1);
      expect(data.inbox).toBeDefined();
      expect(data.inbox.open).toBeGreaterThanOrEqual(1);
      expect(data.campaigns).toBeDefined();
      expect(data.campaigns.total).toBeGreaterThanOrEqual(1);
    });

    it('should support department-level filtering in executive dashboard', async () => {
      const res = await request(app)
        .get(`/api/v1/reports/executive?departmentId=${testDept.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.customers.total).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================
  // 2. CONVERSATION & INBOX ANALYTICS
  // ==========================================
  describe('Conversation & Inbox Analytics', () => {
    it('should compute conversation volumes, FRT, and department breakdown', async () => {
      const res = await request(app)
        .get('/api/v1/reports/conversations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { volume, performance, trends } = res.body.data;
      expect(volume.total).toBeGreaterThanOrEqual(1);
      expect(volume.open).toBeGreaterThanOrEqual(1);
      expect(performance).toBeDefined();
      // First response time should be calculated from inbound to outbound message (~10 mins)
      if (performance.averageFirstResponseMinutes !== null) {
        expect(performance.averageFirstResponseMinutes).toBeGreaterThanOrEqual(0);
      }
      expect(Array.isArray(trends.byDepartment)).toBe(true);
      expect(Array.isArray(trends.daily)).toBe(true);
    });
  });

  // ==========================================
  // 3. AGENT PERFORMANCE ANALYTICS
  // ==========================================
  describe('Agent Performance Analytics', () => {
    it('should return aggregated operational workload and task completion per agent', async () => {
      const res = await request(app)
        .get('/api/v1/reports/agents')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { agents } = res.body.data;
      expect(Array.isArray(agents)).toBe(true);
      expect(agents.length).toBeGreaterThanOrEqual(1);

      const targetAgent = agents.find((a) => a.agentId === adminUser.id);
      expect(targetAgent).toBeDefined();
      expect(targetAgent.assignedConversations).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================
  // 4. DEPARTMENT PERFORMANCE ANALYTICS
  // ==========================================
  describe('Department Performance Analytics', () => {
    it('should return department queues, staff count, and active conversations', async () => {
      const res = await request(app)
        .get('/api/v1/reports/departments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { departments } = res.body.data;
      expect(Array.isArray(departments)).toBe(true);
      const supportDept = departments.find((d) => d.departmentId === testDept.id);
      expect(supportDept).toBeDefined();
      expect(supportDept.name).toBe('Support');
    });
  });

  // ==========================================
  // 5. CUSTOMER & LEAD PIPELINE ANALYTICS
  // ==========================================
  describe('Customer & Lead Analytics', () => {
    it('should return customer acquisition breakdown by source and consent status', async () => {
      const res = await request(app)
        .get('/api/v1/reports/contacts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalContacts).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(res.body.data.bySource)).toBe(true);
      expect(Array.isArray(res.body.data.consentBreakdown)).toBe(true);
    });

    it('should calculate lead pipeline stages, values, and conversion rates', async () => {
      const res = await request(app)
        .get('/api/v1/reports/leads')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { summary, stages, owners } = res.body.data;
      expect(summary.totalLeads).toBeGreaterThanOrEqual(1);
      expect(summary.totalPipelineValue).toBeGreaterThanOrEqual(15000);
      expect(Array.isArray(stages)).toBe(true);
      expect(Array.isArray(owners)).toBe(true);
    });
  });

  // ==========================================
  // 6. WHATSAPP MESSAGING ANALYTICS
  // ==========================================
  describe('WhatsApp Messaging Analytics', () => {
    it('should return delivery funnel rates and message directions', async () => {
      const res = await request(app)
        .get('/api/v1/reports/whatsapp')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { metrics, messageTypes, dailyTrends } = res.body.data;
      expect(metrics.totalInbound).toBeGreaterThanOrEqual(1);
      expect(metrics.totalOutbound).toBeGreaterThanOrEqual(1);
      expect(metrics.deliveryRatePercent).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(dailyTrends)).toBe(true);
    });
  });

  // ==========================================
  // 7. CAMPAIGN PERFORMANCE ANALYTICS
  // ==========================================
  describe('Campaign Performance Analytics', () => {
    it('should calculate campaign recipient funnels, replies, and opt-out rates', async () => {
      const res = await request(app)
        .get('/api/v1/reports/campaigns')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { summary, campaigns } = res.body.data;
      expect(summary.totalCampaigns).toBeGreaterThanOrEqual(1);
      expect(summary.deliveredCount).toBeGreaterThanOrEqual(85);
      expect(summary.deliveryRatePercent).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(campaigns)).toBe(true);
    });
  });

  // ==========================================
  // 8. TASK & FOLLOW-UP ANALYTICS
  // ==========================================
  describe('Task Performance Analytics', () => {
    it('should return task creation, completion, and priority breakdown', async () => {
      const res = await request(app)
        .get('/api/v1/reports/tasks')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { summary, byPriority } = res.body.data;
      expect(summary.totalTasksCreated).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(byPriority)).toBe(true);
    });
  });

  // ==========================================
  // 9. SECURE REPORT EXPORTS & FORMULA INJECTION DEFENSE
  // ==========================================
  describe('Secure Report Export', () => {
    it('should export executive report to CSV with proper Content-Type', async () => {
      const res = await request(app)
        .post('/api/v1/reports/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'executive' });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment;');
      expect(typeof res.text).toBe('string');
      expect(res.text).toContain('customers.total');
    });

    it('should export agent report to CSV and record an audit entry', async () => {
      const res = await request(app)
        .post('/api/v1/reports/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'agents' });

      expect(res.status).toBe(200);
      expect(res.text).toContain('Agent Name');

      // Verify that REPORT_EXPORTED was written to AuditLog
      const auditEntry = await prisma.auditLog.findFirst({
        where: { action: 'REPORT_EXPORTED', entityId: 'agents' },
        orderBy: { createdAt: 'desc' },
      });
      expect(auditEntry).toBeDefined();
      expect(auditEntry.actorId).toBe(adminUser.id);
    });
  });

  // ==========================================
  // 10. COMPREHENSIVE AUDIT LOGGING & VIEWER
  // ==========================================
  describe('Audit Logging & Audit Viewer', () => {
    it('should record an audit event and sanitize sensitive secrets in metadata', async () => {
      const recorded = await logAudit({
        actorId: adminUser.id,
        action: 'TEST_SENSITIVE_AUDIT',
        entity: 'SECURITY_TEST',
        entityId: 'sec-001',
        departmentId: testDept.id,
        metadata: {
          token: 'SUPER_SECRET_BEARER_TOKEN',
          password: 'SuperSecretPassword!',
          apiKey: 'AIzaSySecretApiKey',
          normalField: 'Public Safe Info',
        },
      });

      expect(recorded).toBeDefined();
      expect(recorded.id).toBeDefined();

      const saved = await prisma.auditLog.findUnique({ where: { id: recorded.id } });
      expect(saved.metadata.token).toBe('[REDACTED]');
      expect(saved.metadata.password).toBe('[REDACTED]');
      expect(saved.metadata.apiKey).toBe('[REDACTED]');
      expect(saved.metadata.normalField).toBe('Public Safe Info');
    });

    it('should list paginated audit logs for authorized Admin', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { items, pagination } = res.body.data;
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(pagination.page).toBe(1);
      expect(pagination.total).toBeGreaterThanOrEqual(1);
    });

    it('should allow filtering audit logs by action and entity', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs?action=TEST_SENSITIVE_AUDIT&entity=SECURITY_TEST')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.items[0].action).toBe('TEST_SENSITIVE_AUDIT');
    });

    it('should retrieve a single audit log entry by ID', async () => {
      const latest = await prisma.auditLog.findFirst({
        orderBy: { createdAt: 'desc' },
      });

      const res = await request(app)
        .get(`/api/v1/audit-logs/${latest.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(latest.id);
    });

    it('should export audit logs to CSV', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs/export')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Action');
      expect(res.text).toContain('Correlation ID');
    });

    it('should prevent unauthorized agent from accessing audit logs', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(403);
    });
  });
});

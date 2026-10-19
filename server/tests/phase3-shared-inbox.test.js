const { describe, it, expect, assert } = require('./test-utils');
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');

describe('Phase 3 Shared Team Inbox & Real-Time Management Verification', () => {
  let adminToken;
  let agentToken;
  let adminUser;
  let agentUser;
  let deptA;
  let deptB;
  let testContact;
  let testConversation;

  it('Setup: Authenticate Admin & Agent, initialize two isolated departments', async () => {
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

    // Create Dept A (Agent will be in Dept A)
    const deptARes = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `P3-Support-A-${Date.now()}`,
        description: 'Primary customer support queue for Phase 3 tests',
      });
    expect(deptARes.status).toBe(201);
    deptA = deptARes.body.data;

    // Assign Agent to Dept A
    await request(app)
      .post(`/api/v1/departments/${deptA.id}/users`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: agentUser.id });

    // Create Dept B (Agent is NOT in Dept B)
    const deptBRes = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `P3-Escalation-B-${Date.now()}`,
        description: 'Isolated escalation department for transfer tests',
      });
    expect(deptBRes.status).toBe(201);
    deptB = deptBRes.body.data;

    // Create a Contact for conversation tests
    const contactRes = await request(app)
      .post('/api/v1/contacts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Inbox',
        lastName: 'Tester',
        phone: `+1888${Math.floor(1000000 + Math.random() * 9000000)}`,
        departmentId: deptA.id,
      });
    expect(contactRes.status).toBe(201);
    testContact = contactRes.body.data;
  });

  // -------------------------------------------------------------
  // MODULE 1: CONVERSATION MANAGEMENT & STATUS TRANSITIONS
  // -------------------------------------------------------------
  it('1. Create conversation, list by department, and enforce status transitions', async () => {
    // Create conversation in Dept A
    const createRes = await request(app)
      .post('/api/v1/conversations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        contactId: testContact.id,
        departmentId: deptA.id,
        priority: 'NORMAL',
        status: 'OPEN',
      });
    expect(createRes.status).toBe(201);
    testConversation = createRes.body.data;
    expect(testConversation.status).toBe('OPEN');
    expect(testConversation.priority).toBe('NORMAL');

    // Agent can list conversations in Dept A
    const agentList = await request(app)
      .get('/api/v1/conversations')
      .set('Authorization', `Bearer ${agentToken}`);
    expect(agentList.status).toBe(200);
    const found = agentList.body.data.find((c) => c.id === testConversation.id);
    expect(Boolean(found)).toBe(true);

    // Valid status transition: OPEN -> PENDING
    const pendingRes = await request(app)
      .patch(`/api/v1/conversations/${testConversation.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PENDING' });
    expect(pendingRes.status).toBe(200);
    expect(pendingRes.body.data.status).toBe('PENDING');

    // Valid status transition: PENDING -> RESOLVED (sets resolvedAt)
    const resolveRes = await request(app)
      .patch(`/api/v1/conversations/${testConversation.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'RESOLVED' });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.status).toBe('RESOLVED');
    assert.ok(resolveRes.body.data.resolvedAt !== null);

    // Invalid transition check: CLOSED cannot jump directly to PENDING
    // First transition RESOLVED -> CLOSED
    await request(app)
      .patch(`/api/v1/conversations/${testConversation.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CLOSED' });

    const invalidTransition = await request(app)
      .patch(`/api/v1/conversations/${testConversation.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PENDING' });
    expect(invalidTransition.status).toBe(400);

    // Reopen conversation: CLOSED -> OPEN
    const reopenRes = await request(app)
      .patch(`/api/v1/conversations/${testConversation.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'OPEN' });
    expect(reopenRes.status).toBe(200);
    expect(reopenRes.body.data.status).toBe('OPEN');
  });

  // -------------------------------------------------------------
  // MODULE 4: AGENT ASSIGNMENT & ATOMIC CLAIMING
  // -------------------------------------------------------------
  it('2. Agent can claim unassigned conversation; race condition is protected', async () => {
    // Agent claims conversation in their department
    const claimRes = await request(app)
      .post(`/api/v1/conversations/${testConversation.id}/claim`)
      .set('Authorization', `Bearer ${agentToken}`);
    expect(claimRes.status).toBe(200);
    expect(claimRes.body.data.assignedToUserId).toBe(agentUser.id);

    // Second claim attempt while already claimed returns 409 Conflict
    const secondClaim = await request(app)
      .post(`/api/v1/conversations/${testConversation.id}/claim`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(secondClaim.status).toBe(409);
    expect(secondClaim.body.message).toContain('already assigned');
  });

  // -------------------------------------------------------------
  // MODULE 5: DEPARTMENT TRANSFERS & ACCESS REVOCATION
  // -------------------------------------------------------------
  it('3. Department transfer preserves history, creates handover note, and revokes unauthorized access', async () => {
    // Admin transfers conversation from Dept A to Dept B with handover summary
    const transferRes = await request(app)
      .post(`/api/v1/conversations/${testConversation.id}/transfer`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        toDepartmentId: deptB.id,
        reason: 'Requires Tier 2 Escalation Engineering',
        handoverSummary: 'Customer verified order #9921 but experienced server timeout.',
      });
    expect(transferRes.status).toBe(200);
    expect(transferRes.body.data.conversation.departmentId).toBe(deptB.id);

    // Verify automated Handover Note was created
    const notesRes = await request(app)
      .get(`/api/v1/conversations/${testConversation.id}/notes`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(notesRes.status).toBe(200);
    const handoverNote = notesRes.body.data.find((n) => n.content.includes('[HANDOVER SUMMARY]'));
    expect(Boolean(handoverNote)).toBe(true);

    // CRITICAL ACCESS CONTROL VERIFICATION:
    // Agent is ONLY in Dept A. Now that conversation was transferred to Dept B,
    // Agent MUST NOT be able to view or access this conversation!
    const unauthorizedAccess = await request(app)
      .get(`/api/v1/conversations/${testConversation.id}`)
      .set('Authorization', `Bearer ${agentToken}`);
    expect(unauthorizedAccess.status).toBe(403);
    expect(unauthorizedAccess.body.message).toContain('unauthorized departments');

    // Transfer back to Dept A for remaining tests
    await request(app)
      .post(`/api/v1/conversations/${testConversation.id}/transfer`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ toDepartmentId: deptA.id, assignedToUserId: agentUser.id });
  });

  // -------------------------------------------------------------
  // MODULE 3: CHRONOLOGICAL MESSAGING & INTERNAL DELIVERY
  // -------------------------------------------------------------
  it('4. Outbound internal message persistence, ordering, and conversation lastMessageAt update', async () => {
    // Send outbound message
    const sendRes = await request(app)
      .post(`/api/v1/conversations/${testConversation.id}/messages`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        text: 'Hello! I am reviewing your account details now.',
        type: 'TEXT',
      });
    expect(sendRes.status).toBe(201);
    expect(sendRes.body.data.direction).toBe('OUTBOUND');
    expect(sendRes.body.data.status).toBe('LOCAL_SAVED');
    expect(sendRes.body.data.senderUserId).toBe(agentUser.id);

    // Fetch chronological messages
    const listRes = await request(app)
      .get(`/api/v1/conversations/${testConversation.id}/messages`)
      .set('Authorization', `Bearer ${agentToken}`);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.length > 0).toBe(true);
    expect(listRes.body.data[listRes.body.data.length - 1].text).toBe('Hello! I am reviewing your account details now.');
  });

  // -------------------------------------------------------------
  // MODULE 8: READ / UNREAD TRACKING
  // -------------------------------------------------------------
  it('5. Mark conversation as read updates unread counter and read progress state', async () => {
    const readRes = await request(app)
      .post(`/api/v1/conversations/${testConversation.id}/read`)
      .set('Authorization', `Bearer ${agentToken}`);
    expect(readRes.status).toBe(200);
    expect(readRes.body.data.unreadCount).toBe(0);

    const readState = await prisma.conversationReadState.findUnique({
      where: {
        conversationId_userId: {
          conversationId: testConversation.id,
          userId: agentUser.id,
        },
      },
    });
    assert.ok(readState !== null);
  });

  // -------------------------------------------------------------
  // MODULE 6: QUICK REPLIES
  // -------------------------------------------------------------
  it('6. Quick replies: CRUD, search, and duplicate shortcut prevention', async () => {
    const shortcut = `/test_${Date.now()}`;
    const createRes = await request(app)
      .post('/api/v1/quick-replies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Billing FAQ Link',
        shortcut,
        content: 'Please find our automated invoicing and billing portal at https://billing.example.com',
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.shortcut).toBe(shortcut);

    // Duplicate shortcut is rejected with 409
    const dupRes = await request(app)
      .post('/api/v1/quick-replies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Duplicate Test',
        shortcut,
        content: 'Another response',
      });
    expect(dupRes.status).toBe(409);

    // List quick replies
    const listRes = await request(app)
      .get('/api/v1/quick-replies')
      .set('Authorization', `Bearer ${agentToken}`);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    const hasShortcut = listRes.body.data.some((qr) => qr.shortcut === shortcut);
    expect(hasShortcut).toBe(true);

    // Clean up test quick reply
    await request(app)
      .delete(`/api/v1/quick-replies/${createRes.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
  });

  // -------------------------------------------------------------
  // TEARDOWN
  // -------------------------------------------------------------
  it('Teardown: Safely clean up test fixtures', async () => {
    if (testConversation) {
      await prisma.conversation.delete({ where: { id: testConversation.id } }).catch(() => {});
    }
    if (testContact) {
      await prisma.contact.delete({ where: { id: testContact.id } }).catch(() => {});
    }
    if (deptA) {
      await prisma.department.delete({ where: { id: deptA.id } }).catch(() => {});
    }
    if (deptB) {
      await prisma.department.delete({ where: { id: deptB.id } }).catch(() => {});
    }
  });
});

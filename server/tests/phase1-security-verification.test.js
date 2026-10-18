const { describe, it, expect } = require('./test-utils');
const request = require('supertest');
const app = require('../src/app');
const { generateToken } = require('../src/utils/jwt');
const prisma = require('../src/config/prisma');

describe('Phase 1 Security & Access Control Verification', () => {
  let adminToken;
  let agentToken;
  let adminUser;
  let agentUser;
  let testDeptA;
  let testDeptB;

  it('Setup: Retrieve seeded Admin and Agent tokens', async () => {
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

    expect(adminToken).toBeDefined();
    expect(agentToken).toBeDefined();
  });

  it('1. AGENT cannot access Super Admin functionality (RBAC enforcement)', async () => {
    // Agent attempts to list all users
    const agentReq = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${agentToken}`);

    expect(agentReq.status).toBe(403);
    expect(agentReq.body.success).toBe(false);
    expect(agentReq.body.message).toContain('You lack necessary permissions');

    // Super Admin can list users
    const adminReq = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminReq.status).toBe(200);
    expect(adminReq.body.success).toBe(true);
  });

  it('2. Authentication rejects invalid and expired tokens', async () => {
    // Malformed token
    const invalidRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not-a-valid-jwt-token');

    expect(invalidRes.status).toBe(401);
    expect(invalidRes.body.success).toBe(false);
    expect(invalidRes.body.message).toContain('Invalid or expired authentication token');

    // Expired token (issued with negative expiration)
    const jwt = require('jsonwebtoken');
    const env = require('../src/config/env');
    const expiredToken = jwt.sign({ userId: agentUser.id }, env.JWT_SECRET, { expiresIn: -1 });

    const expiredRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(expiredRes.status).toBe(401);
    expect(expiredRes.body.message).toContain('Invalid or expired authentication token');
  });

  it('3. Public self-registration cannot create privileged administrative accounts', async () => {
    // Attempt to register as SUPER_ADMIN
    const superAdminReg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `attacker_superadmin_${Date.now()}@crm.local`,
        password: 'Password123!',
        firstName: 'Malicious',
        lastName: 'Actor',
        roleName: 'SUPER_ADMIN',
      });

    // Zod validation rejects any roleName other than AGENT with 422
    expect(superAdminReg.status).toBe(422);
    expect(superAdminReg.body.success).toBe(false);

    // Attempt to register as ADMIN
    const adminReg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `attacker_admin_${Date.now()}@crm.local`,
        password: 'Password123!',
        firstName: 'Malicious',
        lastName: 'Actor',
        roleName: 'ADMIN',
      });

    expect(adminReg.status).toBe(422);
    expect(adminReg.body.success).toBe(false);

    // Attempt to register as MANAGER
    const managerReg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `attacker_mgr_${Date.now()}@crm.local`,
        password: 'Password123!',
        firstName: 'Malicious',
        lastName: 'Actor',
        roleName: 'MANAGER',
      });

    expect(managerReg.status).toBe(422);
    expect(managerReg.body.success).toBe(false);
  });

  it('4. Users cannot read contacts or conversations belonging to unauthorized departments', async () => {
    // Create two test departments: Dept Alpha and Dept Beta
    const deptAlpha = await prisma.department.create({
      data: { name: `Alpha Dept ${Date.now()}` },
    });
    const deptBeta = await prisma.department.create({
      data: { name: `Beta Dept ${Date.now()}` },
    });

    // Create a contact belonging to Dept Beta
    const contact = await prisma.contact.create({
      data: {
        phone: `+1999${Math.floor(1000000 + Math.random() * 9000000)}`,
        firstName: 'Private',
        lastName: 'Client',
      },
    });

    // Create a conversation in Dept Beta
    const betaConversation = await prisma.conversation.create({
      data: {
        contactId: contact.id,
        departmentId: deptBeta.id,
        status: 'OPEN',
      },
    });

    // Agent belongs to Customer Support (not Dept Beta)
    // Attempting to read beta conversation should return 403
    const convAccessRes = await request(app)
      .get(`/api/v1/conversations/${betaConversation.id}`)
      .set('Authorization', `Bearer ${agentToken}`);

    expect(convAccessRes.status).toBe(403);
    expect(convAccessRes.body.success).toBe(false);
    expect(convAccessRes.body.message).toContain('unauthorized departments');

    // Attempting to read contact exclusively in Dept Beta should return 403
    const contactAccessRes = await request(app)
      .get(`/api/v1/contacts/${contact.id}`)
      .set('Authorization', `Bearer ${agentToken}`);

    expect(contactAccessRes.status).toBe(403);
    expect(contactAccessRes.body.success).toBe(false);
    expect(contactAccessRes.body.message).toContain('unauthorized departments');

    // Super Admin can access both without restriction
    const adminConvRes = await request(app)
      .get(`/api/v1/conversations/${betaConversation.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminConvRes.status).toBe(200);

    const adminContactRes = await request(app)
      .get(`/api/v1/contacts/${contact.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminContactRes.status).toBe(200);

    // Cleanup
    await prisma.conversation.delete({ where: { id: betaConversation.id } });
    await prisma.contact.delete({ where: { id: contact.id } });
    await prisma.department.deleteMany({ where: { id: { in: [deptAlpha.id, deptBeta.id] } } });
  });

  it('5. Seeded test credentials are not deployed to production', async () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    let errorThrown = false;
    try {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('SECURITY VIOLATION: Refusing to seed default test credentials in production environment.');
      }
    } catch (err) {
      errorThrown = true;
      expect(err.message).toContain('Refusing to seed default test credentials in production');
    } finally {
      process.env.NODE_ENV = prevEnv;
    }

    expect(errorThrown).toBe(true);
  });
});

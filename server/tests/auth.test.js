const { describe, it, expect } = require('./test-utils');
const request = require('supertest');
const app = require('../src/app');

describe('Authentication Validation Tests', () => {
  it('POST /api/v1/auth/login should fail with 422 if credentials are missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  it('POST /api/v1/auth/register should fail with 422 on invalid email format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'invalid-email',
        password: 'short',
        firstName: 'John',
        lastName: 'Doe',
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/auth/me should reject without Bearer token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Authentication token missing');
  });
});

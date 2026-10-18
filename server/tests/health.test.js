const { describe, it, expect } = require('./test-utils');
const request = require('supertest');
const app = require('../src/app');

describe('Health and System Endpoints', () => {
  it('GET / should return service information', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('WhatsApp Business CRM API');
    expect(res.body.version).toBe('1.0.0');
  });

  it('GET /api/v1/health should return healthy status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('whatsapp-business-crm-api');
  });

  it('GET /api/v1/unknown-route should return 404 ApiError response', async () => {
    const res = await request(app).get('/api/v1/unknown-route');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Endpoint not found');
  });
});

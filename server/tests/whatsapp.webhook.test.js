const { describe, it, expect } = require('./test-utils');
const request = require('supertest');
const app = require('../src/app');
const env = require('../src/config/env');

describe('WhatsApp Webhook Handlers', () => {
  it('GET /api/v1/webhooks/whatsapp should echo challenge when verify_token matches', async () => {
    const challengeCode = '1158201444';
    const res = await request(app)
      .get('/api/v1/webhooks/whatsapp')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': env.WHATSAPP_VERIFY_TOKEN,
        'hub.challenge': challengeCode,
      });

    expect(res.status).toBe(200);
    expect(res.text).toBe(challengeCode);
  });

  it('GET /api/v1/webhooks/whatsapp should return 403 on invalid verify_token', async () => {
    const res = await request(app)
      .get('/api/v1/webhooks/whatsapp')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong_token',
        'hub.challenge': '12345',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/webhooks/whatsapp should acknowledge webhook events with 200 OK', async () => {
    const dummyPayload = {
      object: 'whatsapp_business_account',
      entry: [],
    };

    const res = await request(app)
      .post('/api/v1/webhooks/whatsapp')
      .send(dummyPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('EVENT_RECEIVED');
  });
});

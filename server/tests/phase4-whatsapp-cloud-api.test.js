const { describe, it, before, after } = require('node:test');
const request = require('supertest');
const crypto = require('crypto');
const app = require('../src/app');
const prisma = require('../src/config/prisma');
const whatsAppConfig = require('../src/integrations/whatsapp/whatsapp.config');
const whatsAppService = require('../src/integrations/whatsapp/whatsapp.service');
const whatsAppMediaService = require('../src/integrations/whatsapp/whatsapp.media.service');
const { expect } = require('./test-utils');

describe('Phase 4 — Official Meta WhatsApp Cloud API Integration Verification', () => {
  let adminToken;
  let testContact;
  let testConversation;
  const testSecret = 'test_webhook_app_secret_12345';

  before(async () => {
    // 1. Authenticate Admin User
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@crm.local', password: 'Admin123!' });
    adminToken = loginRes.body.data.token;

    // Temporarily set appSecret for HMAC signature testing
    whatsAppConfig.appSecret = testSecret;

    // 2. Create isolated test Contact
    testContact = await prisma.contact.create({
      data: {
        phone: '+18005550199',
        waId: '18005550199',
        firstName: 'MetaTest',
        lastName: 'Customer',
        source: 'WHATSAPP',
      },
    });

    // 3. Create active Conversation for test contact
    testConversation = await prisma.conversation.create({
      data: {
        contactId: testContact.id,
        channel: 'WHATSAPP',
        status: 'OPEN',
        priority: 'NORMAL',
        lastMessageAt: new Date(),
        lastInboundMessageAt: new Date(), // Window open
      },
    });
  });

  after(async () => {
    // Clean up test records
    await prisma.message.deleteMany({ where: { conversationId: testConversation?.id } });
    if (testConversation) {
      await prisma.conversation.delete({ where: { id: testConversation.id } }).catch(() => {});
    }
    if (testContact) {
      await prisma.contact.delete({ where: { id: testContact.id } }).catch(() => {});
    }
  });

  // -------------------------------------------------------------
  // MODULE 1: CONFIGURATION & READINESS
  // -------------------------------------------------------------
  it('1. GET /api/v1/integrations/whatsapp/status reports readiness without leaking secrets', async () => {
    const res = await request(app)
      .get('/api/v1/integrations/whatsapp/status')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.enabled).toBe(true);
    expect(res.body.data.mode).toBe('mock');
    expect(res.body.data.isReady).toBe(true);
    // Ensure secrets are never exposed
    expect(res.body.data.accessToken).toBe(undefined);
    expect(res.body.data.appSecret).toBe(undefined);
  });

  // -------------------------------------------------------------
  // MODULE 3: WEBHOOK VERIFICATION & HMAC-SHA256 SIGNATURE SECURITY
  // -------------------------------------------------------------
  it('2. POST /api/v1/webhooks/whatsapp enforces timing-safe HMAC-SHA256 signature verification', async () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [],
    };
    const rawBodyString = JSON.stringify(payload);

    // Calculate valid HMAC-SHA256 signature
    const validSignature = `sha256=${crypto
      .createHmac('sha256', testSecret)
      .update(rawBodyString)
      .digest('hex')}`;

    // A. Valid signature: 200 OK
    const validRes = await request(app)
      .post('/api/v1/webhooks/whatsapp')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature-256', validSignature)
      .send(payload);

    expect(validRes.status).toBe(200);
    expect(validRes.body.message).toBe('EVENT_RECEIVED');

    // B. Invalid signature: 401 Unauthorized
    const invalidSignature = 'sha256=bad_hex_hash_0000000000000000000000000000000000000000000000000000000000000000';
    const invalidRes = await request(app)
      .post('/api/v1/webhooks/whatsapp')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature-256', invalidSignature)
      .send(payload);

    expect(invalidRes.status).toBe(401);
  });

  // -------------------------------------------------------------
  // MODULE 4: INBOUND MESSAGE INGESTION & DEDUPLICATION
  // -------------------------------------------------------------
  it('3. Ingests inbound WhatsApp message, updates conversation, and prevents duplicate wamid', async () => {
    const testWamid = `wamid.HBgL${Date.now()}`;
    const webhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WHATSAPP_BIZ_123',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                contacts: [{ profile: { name: 'Sarah Jenkins' }, wa_id: '18005550199' }],
                messages: [
                  {
                    from: '18005550199',
                    id: testWamid,
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    type: 'text',
                    text: { body: 'Hello Stech, I need an invoice copy.' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    // A. Process Inbound message
    await whatsAppService.processWebhookPayload(webhookPayload);

    // Verify message was created
    const savedMsg = await prisma.message.findUnique({
      where: { waMessageId: testWamid },
    });
    expect(Boolean(savedMsg)).toBe(true);
    expect(savedMsg.text).toBe('Hello Stech, I need an invoice copy.');
    expect(savedMsg.direction).toBe('INBOUND');
    expect(savedMsg.status).toBe('DELIVERED');

    // B. Deduplication: process same webhook payload again
    await whatsAppService.processWebhookPayload(webhookPayload);
    const count = await prisma.message.count({ where: { waMessageId: testWamid } });
    expect(count).toBe(1); // Still exactly 1, no duplicate inserted
  });

  // -------------------------------------------------------------
  // MODULE 4 (COMPLIANCE): OPT-OUT KEYWORD PROCESSING
  // -------------------------------------------------------------
  it('4. Inbound opt-out keyword (STOP) automatically revokes consent and sets isOptedOut', async () => {
    const optOutWamid = `wamid.optout.${Date.now()}`;
    const optOutPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WHATSAPP_BIZ_123',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                contacts: [{ profile: { name: 'MetaTest Customer' }, wa_id: '18005550199' }],
                messages: [
                  {
                    from: '18005550199',
                    id: optOutWamid,
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    type: 'text',
                    text: { body: 'STOP' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    await whatsAppService.processWebhookPayload(optOutPayload);

    const updatedContact = await prisma.contact.findUnique({
      where: { id: testContact.id },
    });
    expect(updatedContact.isOptedOut).toBe(true);
    expect(updatedContact.consentStatus).toBe('REVOKED');
  });

  // -------------------------------------------------------------
  // MODULE 5 & 6: 24-HOUR CUSTOMER SERVICE WINDOW & OUTBOUND DISPATCH
  // -------------------------------------------------------------
  it('5. Allows free-form reply within 24h window, blocks when expired, and allows approved template', async () => {
    // A. Inside 24h window: free-form text succeeds
    await prisma.conversation.update({
      where: { id: testConversation.id },
      data: { lastInboundMessageAt: new Date() },
    });

    const sendRes = await request(app)
      .post(`/api/v1/conversations/${testConversation.id}/send-text`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ text: 'Hi Sarah, glad to help you today!' });

    expect(sendRes.status).toBe(201);
    expect(sendRes.body.data.direction).toBe('OUTBOUND');
    expect(sendRes.body.data.status).toBe('SENT');
    expect(Boolean(sendRes.body.data.waMessageId)).toBe(true);

    // B. Outside 24h window: free-form text is rejected with 422 OUTSIDE_24H_WINDOW
    const expiredTimestamp = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
    await prisma.conversation.update({
      where: { id: testConversation.id },
      data: { lastInboundMessageAt: expiredTimestamp },
    });

    const expiredRes = await request(app)
      .post(`/api/v1/conversations/${testConversation.id}/send-text`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ text: 'Following up after window closed.' });

    expect(expiredRes.status).toBe(422);
    expect(expiredRes.body.message.includes('Outside 24-hour customer service window')).toBe(true);

    // C. Approved Template Message: permitted even when window is expired!
    const templateRes = await request(app)
      .post(`/api/v1/conversations/${testConversation.id}/send-template`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        templateName: 'welcome_greeting',
        languageCode: 'en_US',
        components: [
          {
            type: 'body',
            parameters: [{ type: 'text', text: 'Sarah' }],
          },
        ],
      });

    expect(templateRes.status).toBe(201);
    expect(templateRes.body.data.direction).toBe('OUTBOUND');
    expect(templateRes.body.data.type).toBe('TEMPLATE');
    expect(templateRes.body.data.text.includes('Hello Sarah')).toBe(true);
  });

  // -------------------------------------------------------------
  // MODULE 8: DELIVERY & READ RECEIPT TRACKING (NON-REGRESSIVE)
  // -------------------------------------------------------------
  it('6. Webhook status receipts progress SENT -> DELIVERED -> READ without regressing', async () => {
    // Create outbound test message
    const msg = await prisma.message.create({
      data: {
        conversationId: testConversation.id,
        direction: 'OUTBOUND',
        type: 'TEXT',
        text: 'Receipt test message',
        waMessageId: `wamid.status.${Date.now()}`,
        status: 'SENT',
      },
    });

    // 1. Process "delivered" webhook receipt
    await whatsAppService.processWebhookPayload({
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                statuses: [
                  {
                    id: msg.waMessageId,
                    status: 'delivered',
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    let refreshedMsg = await prisma.message.findUnique({ where: { id: msg.id } });
    expect(refreshedMsg.status).toBe('DELIVERED');

    // 2. Process "read" webhook receipt
    await whatsAppService.processWebhookPayload({
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                statuses: [
                  {
                    id: msg.waMessageId,
                    status: 'read',
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    refreshedMsg = await prisma.message.findUnique({ where: { id: msg.id } });
    expect(refreshedMsg.status).toBe('READ');

    // 3. Non-regressive check: delayed "delivered" receipt must NOT revert READ back to DELIVERED
    await whatsAppService.processWebhookPayload({
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                statuses: [
                  {
                    id: msg.waMessageId,
                    status: 'delivered',
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    refreshedMsg = await prisma.message.findUnique({ where: { id: msg.id } });
    expect(refreshedMsg.status).toBe('READ'); // Still READ
  });

  // -------------------------------------------------------------
  // MODULE 9: MEDIA CONSTRAINT VALIDATION
  // -------------------------------------------------------------
  it('7. Validates supported media constraints against Meta limits', () => {
    // A. Valid image
    expect(whatsAppMediaService.validateMediaConstraints('image', 'image/jpeg', 2 * 1024 * 1024)).toBe(true);

    // B. Oversized image (> 5MB)
    try {
      whatsAppMediaService.validateMediaConstraints('image', 'image/jpeg', 6 * 1024 * 1024);
      expect(true).toBe(false); // Should not reach
    } catch (err) {
      expect(err.code).toBe('INVALID_MEDIA_CONSTRAINTS');
    }

    // C. Unsupported MIME type
    try {
      whatsAppMediaService.validateMediaConstraints('image', 'image/bmp', 1024);
      expect(true).toBe(false); // Should not reach
    } catch (err) {
      expect(err.code).toBe('INVALID_MEDIA_CONSTRAINTS');
    }
  });

  // -------------------------------------------------------------
  // MODULE 7: TEMPLATES RETRIEVAL API
  // -------------------------------------------------------------
  it('8. GET /api/v1/integrations/whatsapp/templates lists approved WhatsApp templates', async () => {
    const res = await request(app)
      .get('/api/v1/integrations/whatsapp/templates')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length > 0).toBe(true);
    const welcomeTpl = res.body.data.find((t) => t.name === 'welcome_greeting');
    expect(Boolean(welcomeTpl)).toBe(true);
    expect(welcomeTpl.status).toBe('APPROVED');
  });
});

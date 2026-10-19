const { describe, it, before, after } = require('node:test');
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');
const campaignQueue = require('../src/modules/campaigns/campaign.queue');
const automationService = require('../src/modules/marketing/automations/automation.service');
const { expect } = require('./test-utils');

describe('Phase 5 — Marketing Campaigns, Audience Segmentation, Scheduling & Automation Verification', () => {
  let adminToken;
  let agentToken;
  let adminUser;
  let agentUser;
  let testContact1;
  let testContact2;
  let testTemplate;
  let testSegment;
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

    // 3. Ensure an Approved WhatsApp Template exists
    testTemplate = await prisma.messageTemplate.findFirst({
      where: { name: 'welcome_greeting', status: 'APPROVED' },
    });
    if (!testTemplate) {
      testTemplate = await prisma.messageTemplate.create({
        data: {
          name: 'welcome_greeting',
          category: 'MARKETING',
          language: 'en_US',
          body: 'Hello {{1}}, welcome to {{2}}!',
          status: 'APPROVED',
        },
      });
    }

    // 4. Create two test contacts:
    // Contact 1: Valid marketing opt-in (GRANTED), tag 'PHASE5_TEST'
    testContact1 = await prisma.contact.create({
      data: {
        phone: '+18005559901',
        waId: '18005559901',
        firstName: 'Taylor',
        lastName: 'Swift',
        company: 'Eras Tour Corp',
        tags: ['PHASE5_TEST', 'VIP'],
        consentStatus: 'GRANTED',
        isOptedOut: false,
        source: 'CAMPAIGN_TEST',
      },
    });

    // Contact 2: Opted out (REVOKED), tag 'PHASE5_TEST'
    testContact2 = await prisma.contact.create({
      data: {
        phone: '+18005559902',
        waId: '18005559902',
        firstName: 'Jordan',
        lastName: 'Belfort',
        company: 'Oakmont',
        tags: ['PHASE5_TEST'],
        consentStatus: 'REVOKED',
        isOptedOut: true,
        optOutAt: new Date(),
        source: 'CAMPAIGN_TEST',
      },
    });
  });

  after(async () => {
    // Clean up created records
    campaignQueue.stopWorkers();
    if (testCampaign) {
      await prisma.campaignSendJob.deleteMany({ where: { campaignId: testCampaign.id } });
      await prisma.campaignRecipient.deleteMany({ where: { campaignId: testCampaign.id } });
      await prisma.campaignActivityLog.deleteMany({ where: { campaignId: testCampaign.id } });
      await prisma.campaignApproval.deleteMany({ where: { campaignId: testCampaign.id } });
      await prisma.campaign.delete({ where: { id: testCampaign.id } }).catch(() => {});
    }
    if (testSegment) {
      await prisma.marketingSegment.delete({ where: { id: testSegment.id } }).catch(() => {});
    }
    if (testContact1) {
      await prisma.consent.deleteMany({ where: { contactId: testContact1.id } });
      await prisma.contact.delete({ where: { id: testContact1.id } }).catch(() => {});
    }
    if (testContact2) {
      await prisma.consent.deleteMany({ where: { contactId: testContact2.id } });
      await prisma.contact.delete({ where: { id: testContact2.id } }).catch(() => {});
    }
  });

  it('1. Audience Segmentation: Creates segment and calculates eligible vs suppressed preview counts', async () => {
    // Preview ad-hoc filters
    const previewRes = await request(app)
      .post('/api/v1/marketing/segments/preview')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        filters: {
          tags: ['PHASE5_TEST'],
          consentOnly: true,
          isOptedOut: false,
        },
      });

    expect(previewRes.status).toBe(200);
    expect(previewRes.body.data.totalAudience).toBeGreaterThanOrEqual(2);
    expect(previewRes.body.data.eligibleCount).toBeGreaterThanOrEqual(1);
    expect(previewRes.body.data.suppressedCount).toBeGreaterThanOrEqual(1);

    // Save audience segment
    const createRes = await request(app)
      .post('/api/v1/marketing/segments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'VIP Phase 5 Segment',
        description: 'Targeted segment for VIP test users',
        filters: {
          tags: ['PHASE5_TEST'],
          consentOnly: true,
          isOptedOut: false,
        },
      });

    expect(createRes.status).toBe(201);
    testSegment = createRes.body.data;
    expect(testSegment.id).toBeDefined();
    expect(testSegment.name).toBe('VIP Phase 5 Segment');
  });

  it('2. Marketing Consent Management: Records affirmative opt-in, revocation, and immutable history', async () => {
    // Check initial consent status
    const statusRes = await request(app)
      .get(`/api/v1/contacts/${testContact1.id}/marketing-consent`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.consentStatus).toBe('GRANTED');
    expect(statusRes.body.data.isMarketingEligible).toBe(true);

    // Revoke consent
    const revokeRes = await request(app)
      .post(`/api/v1/contacts/${testContact1.id}/marketing-consent`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'REVOKED',
        source: 'MANUAL_STAFF',
        notes: 'Customer requested unsubscribe verbally over phone call',
      });

    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.data.contact.consentStatus).toBe('REVOKED');
    expect(revokeRes.body.data.contact.isOptedOut).toBe(true);

    // Re-grant consent affirmatively
    const grantRes = await request(app)
      .post(`/api/v1/contacts/${testContact1.id}/marketing-consent`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'GRANTED',
        source: 'WEB_FORM',
        proof: 'Signed marketing consent form #8472',
      });

    expect(grantRes.status).toBe(200);
    expect(grantRes.body.data.contact.consentStatus).toBe('GRANTED');
    expect(grantRes.body.data.contact.isOptedOut).toBe(false);

    // Verify chronological audit history
    const historyRes = await request(app)
      .get(`/api/v1/contacts/${testContact1.id}/consent-history`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(historyRes.status).toBe(200);
    expect(Array.isArray(historyRes.body.data)).toBe(true);
    expect(historyRes.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('3. Campaign Creation & Validation: Builds draft campaign with template variable mappings', async () => {
    const res = await request(app)
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Autumn Special Broadcast',
        description: 'Seasonal promotion broadcast for test cohort',
        type: 'BROADCAST',
        audienceSegmentId: testSegment.id,
        templateId: testTemplate.id,
        parameters: {
          '1': 'firstName',
          '2': 'company',
        },
        timezone: 'UTC',
      });

    expect(res.status).toBe(201);
    testCampaign = res.body.data;
    expect(testCampaign.status).toBe('DRAFT');
    expect(testCampaign.name).toBe('Autumn Special Broadcast');

    // Test preview of personalized message
    const previewRes = await request(app)
      .post(`/api/v1/campaigns/${testCampaign.id}/preview`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(previewRes.status).toBe(200);
    expect(previewRes.body.data.samplePersonalizedMessage).toBeDefined();
    expect(previewRes.body.data.samplePersonalizedMessage).toContain('Taylor');
  });

  it('4. Maker-Checker Review Workflow: Enforces approval controls and invalidates on material edits', async () => {
    // 1. Submit for approval
    const submitRes = await request(app)
      .post(`/api/v1/campaigns/${testCampaign.id}/submit-approval`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.status).toBe('PENDING_APPROVAL');

    // 2. Maker-checker policy check:
    // If agent tries to approve without campaigns:approve permission -> 403 Forbidden
    const unauthApprove = await request(app)
      .post(`/api/v1/campaigns/${testCampaign.id}/approve`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ comment: 'Agent self-signoff' });

    expect(unauthApprove.status).toBe(403);

    // 3. Admin approves campaign
    const approveRes = await request(app)
      .post(`/api/v1/campaigns/${testCampaign.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ comment: 'Verified audience consent and content compliance' });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('APPROVED');

    // 4. Invalidation on material edits:
    // Modifying parameters of an approved campaign should automatically revert it to DRAFT
    const patchRes = await request(app)
      .patch(`/api/v1/campaigns/${testCampaign.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        parameters: {
          '1': 'lastName',
          '2': 'company',
        },
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.status).toBe('DRAFT');

    // Re-submit and approve for subsequent tests
    await request(app)
      .post(`/api/v1/campaigns/${testCampaign.id}/submit-approval`)
      .set('Authorization', `Bearer ${adminToken}`);

    await request(app)
      .post(`/api/v1/campaigns/${testCampaign.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ comment: 'Re-approved after revision' });
  });

  it('5. Campaign Scheduling: Validates future ISO execution time and schedules campaign', async () => {
    const futureTime = new Date(Date.now() + 3600000).toISOString();

    const scheduleRes = await request(app)
      .post(`/api/v1/campaigns/${testCampaign.id}/schedule`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        scheduledAt: futureTime,
        timezone: 'UTC',
      });

    expect(scheduleRes.status).toBe(200);
    expect(scheduleRes.body.data.status).toBe('SCHEDULED');
  });

  it('6. Durable Queue & Worker Execution: Dispatches campaign, creates recipients, and suppresses opted-out contacts', async () => {
    // Launch campaign immediately
    const startRes = await request(app)
      .post(`/api/v1/campaigns/${testCampaign.id}/start`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(startRes.status).toBe(200);
    expect(startRes.body.data.status).toBe('RUNNING');
    expect(startRes.body.data.totalRecipients).toBeGreaterThanOrEqual(2);
    expect(startRes.body.data.eligibleCount).toBeGreaterThanOrEqual(1);
    expect(startRes.body.data.suppressedCount).toBeGreaterThanOrEqual(1);

    // Verify recipient snapshot in database
    const recipientsRes = await request(app)
      .get(`/api/v1/campaigns/${testCampaign.id}/recipients`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(recipientsRes.status).toBe(200);
    expect(recipientsRes.body.data.length).toBeGreaterThanOrEqual(2);

    // Check opted-out contact is marked SUPPRESSED
    const suppressed = recipientsRes.body.data.find((r) => r.contact.id === testContact2.id);
    expect(suppressed).toBeDefined();
    expect(suppressed.recipientStatus).toBe('SUPPRESSED');

    // Process worker batch
    await new Promise((r) => setTimeout(r, 100));
    await campaignQueue.processNextBatch();

    // Verify eligible contact received dispatched message
    const updatedRecipientsRes = await request(app)
      .get(`/api/v1/campaigns/${testCampaign.id}/recipients`)
      .set('Authorization', `Bearer ${adminToken}`);

    const eligible = updatedRecipientsRes.body.data.find((r) => r.contact.id === testContact1.id);
    expect(eligible).toBeDefined();
    expect(eligible.recipientStatus).toBe('SENT');
    expect(eligible.waMessageId).toBeDefined();
  });

  it('7. Real-Time Pre-Send Consent Re-Check: Suppresses send if contact revokes consent right before dispatch', async () => {
    // Create an eligible contact, queue send job, then immediately revoke consent before worker runs
    const testLatePhone = `+1800555${Math.floor(1000 + Math.random() * 9000)}`;
    const lateContact = await prisma.contact.create({
      data: {
        phone: testLatePhone,
        waId: testLatePhone.replace('+', ''),
        firstName: 'LateOptOut',
        consentStatus: 'GRANTED',
        isOptedOut: false,
      },
    });

    const recipient = await prisma.campaignRecipient.create({
      data: {
        campaignId: testCampaign.id,
        contactId: lateContact.id,
        phone: lateContact.phone,
        recipientStatus: 'QUEUED',
      },
    });

    const sendJob = await prisma.campaignSendJob.create({
      data: {
        campaignId: testCampaign.id,
        recipientId: recipient.id,
        status: 'PENDING',
      },
    });

    // Customer revokes consent in the nick of time
    await prisma.contact.update({
      where: { id: lateContact.id },
      data: { isOptedOut: true, consentStatus: 'REVOKED' },
    });

    // Worker attempts to process job
    const jobWithRelations = await prisma.campaignSendJob.findUnique({
      where: { id: sendJob.id },
      include: {
        campaign: { include: { template: true } },
        recipient: { include: { contact: true } },
      },
    });

    await campaignQueue.processSingleJob(jobWithRelations);

    // Verify recipient was suppressed rather than dispatched
    const updatedRecipient = await prisma.campaignRecipient.findUnique({
      where: { id: recipient.id },
    });
    expect(updatedRecipient.recipientStatus).toBe('SUPPRESSED');
    expect(updatedRecipient.errorDetails).toContain('revoked consent or opted out');

    // Clean up temporary contact
    await prisma.campaignSendJob.delete({ where: { id: sendJob.id } }).catch(() => {});
    await prisma.campaignRecipient.delete({ where: { id: recipient.id } }).catch(() => {});
    await prisma.contact.delete({ where: { id: lateContact.id } }).catch(() => {});
  });

  it('8. Customer Response Attribution & Opt-Out Webhook: Attributes inbound reply and opt-out keyword to campaign', async () => {
    // 1. Inbound normal reply from Taylor (who received campaign message)
    await request(app)
      .post('/api/v1/webhooks/whatsapp')
      .set('x-test-sync', 'true')
      .send({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { display_phone_number: '15550001234', phone_number_id: '100000000000001' },
                  contacts: [{ profile: { name: 'Taylor' }, wa_id: '18005559901' }],
                  messages: [
                    {
                      from: '18005559901',
                      id: `wamid.reply.${Date.now()}`,
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                      type: 'text',
                      text: { body: 'Thanks for the welcome message!' },
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      });

    // 2. Verify campaign repliedCount incremented
    const resultsRes = await request(app)
      .get(`/api/v1/campaigns/${testCampaign.id}/results`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resultsRes.status).toBe(200);
    expect(resultsRes.body.data.metrics.repliedCount).toBeGreaterThanOrEqual(1);

    // 3. Customer sends STOP keyword
    await request(app)
      .post('/api/v1/webhooks/whatsapp')
      .set('x-test-sync', 'true')
      .send({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { display_phone_number: '15550001234', phone_number_id: '100000000000001' },
                  contacts: [{ profile: { name: 'Taylor' }, wa_id: '18005559901' }],
                  messages: [
                    {
                      from: '18005559901',
                      id: `wamid.stop.${Date.now()}`,
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                      type: 'text',
                      text: { body: 'STOP' },
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      });

    // 4. Verify contact is opted out and campaign optOutCount incremented
    const updatedContact = await prisma.contact.findUnique({ where: { id: testContact1.id } });
    expect(updatedContact.isOptedOut).toBe(true);
    expect(updatedContact.consentStatus).toBe('REVOKED');

    const updatedResults = await request(app)
      .get(`/api/v1/campaigns/${testCampaign.id}/results`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(updatedResults.body.data.metrics.optOutCount).toBeGreaterThanOrEqual(1);
  });

  it('9. Basic Marketing Automation: Evaluates trigger condition and executes automated task action', async () => {
    // Create an automation rule: on LEAD_STAGE_CHANGED where stage is WON -> CREATE_TASK
    const ruleRes = await request(app)
      .post('/api/v1/marketing/automations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Auto Welcome Task for Won Deals',
        description: 'Generates onboarding task when lead reaches WON stage',
        triggerType: 'LEAD_STAGE_CHANGED',
        conditions: { stage: 'WON' },
        actionType: 'CREATE_TASK',
        actionConfig: { taskTitle: 'Schedule VIP Onboarding Kickoff Call', priority: 'HIGH' },
        isActive: true,
      });

    expect(ruleRes.status).toBe(201);
    const rule = ruleRes.body.data;
    expect(rule.id).toBeDefined();

    // Trigger evaluation
    const execResults = await automationService.evaluateTrigger('LEAD_STAGE_CHANGED', {
      contactId: testContact1.id,
      stage: 'WON',
    });

    expect(Array.isArray(execResults)).toBe(true);
    const successResult = execResults.find((r) => r.ruleId === rule.id);
    expect(successResult).toBeDefined();
    expect(successResult.status).toBe('SUCCESS');

    // Verify Task was created in CRM
    const createdTask = await prisma.task.findFirst({
      where: { title: 'Schedule VIP Onboarding Kickoff Call' },
    });
    expect(createdTask).toBeDefined();
    expect(createdTask.priority).toBe('HIGH');

    // Clean up rule and task
    await prisma.marketingAutomationRule.delete({ where: { id: rule.id } });
    if (createdTask) {
      await prisma.task.delete({ where: { id: createdTask.id } });
    }
  });
});

const prisma = require('../../config/prisma');
const whatsappService = require('../../integrations/whatsapp/whatsapp.service');
const segmentService = require('../marketing/segments/segment.service');
const { CAMPAIGN_STATUS, RECIPIENT_STATUS, JOB_STATUS } = require('./campaign.constants');
const { logActivity } = require('../../utils/activityLogger');
const { ApiError } = require('../../errors');

const env = require('../../config/env');

class CampaignQueue {
  constructor() {
    this.isProcessing = false;
    this.workerInterval = null;
    this.schedulerInterval = null;
    this.rateLimitDelayMs = env.CAMPAIGN_RATE_LIMIT_DELAY_MS || 50;
    this.batchSize = env.CAMPAIGN_BATCH_SIZE || 10;
  }

  /**
   * Start the in-process queue worker and scheduler loops
   */
  startWorkers() {
    if (!env.CAMPAIGN_WORKER_ENABLED) {
      console.log('[CampaignQueue] Background workers disabled via CAMPAIGN_WORKER_ENABLED=false');
      return;
    }

    if (this.workerInterval) return;

    this.workerInterval = setInterval(() => {
      this.processNextBatch().catch((err) => {
        console.error('[CampaignQueue] Error during worker batch processing:', err.message);
      });
    }, 1000);

    this.schedulerInterval = setInterval(() => {
      this.checkScheduledCampaigns().catch((err) => {
        console.error('[CampaignQueue] Error checking scheduled campaigns:', err.message);
      });
    }, 5000);

    console.log('[CampaignQueue] Durable Campaign Worker and Scheduler started.');
  }

  /**
   * Stop background loops (used in tests/shutdown)
   */
  stopWorkers() {
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
      this.workerInterval = null;
    }
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
  }

  /**
   * Snapshot audience contacts into durable CampaignRecipient and CampaignSendJob records
   */
  async snapshotAndLaunch(campaignId, actorId) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        template: true,
        audienceSegment: true,
      },
    });

    if (!campaign) {
      throw new ApiError(404, 'Campaign not found');
    }

    if (!['APPROVED', 'SCHEDULED'].includes(campaign.status)) {
      throw new ApiError(400, `Cannot start campaign with status "${campaign.status}". Must be APPROVED or SCHEDULED.`);
    }

    if (!campaign.template || campaign.template.status !== 'APPROVED') {
      throw new ApiError(400, 'Cannot launch campaign: Template is missing or not APPROVED by Meta.');
    }

    // 1. Fetch matching audience contacts
    let contacts = [];
    if (campaign.audienceSegment) {
      const where = segmentService.buildContactQuery(
        campaign.audienceSegment.filters,
        { role: { name: 'ADMIN' } }, // Evaluated at system campaign worker scope
        false // get full segment to calculate suppression cleanly
      );
      contacts = await prisma.contact.findMany({
        where,
        select: {
          id: true,
          phone: true,
          waId: true,
          firstName: true,
          lastName: true,
          company: true,
          consentStatus: true,
          isOptedOut: true,
        },
      });
    }

    const totalRecipients = contacts.length;
    let eligibleCount = 0;
    let suppressedCount = 0;

    // 2. Classify and populate durable recipients & send jobs
    for (const contact of contacts) {
      const isEligible =
        contact.consentStatus === 'GRANTED' &&
        !contact.isOptedOut &&
        (contact.phone || contact.waId);

      const recipientStatus = isEligible ? RECIPIENT_STATUS.QUEUED : RECIPIENT_STATUS.SUPPRESSED;
      const errorDetails = isEligible
        ? null
        : contact.isOptedOut
        ? 'Customer is opted out'
        : contact.consentStatus !== 'GRANTED'
        ? 'No affirmative marketing consent'
        : 'Missing phone identifier';

      if (isEligible) {
        eligibleCount++;
      } else {
        suppressedCount++;
      }

      // Upsert recipient (guarantee deduplication via unique campaignId + contactId)
      const recipient = await prisma.campaignRecipient.upsert({
        where: {
          campaignId_contactId: {
            campaignId: campaign.id,
            contactId: contact.id,
          },
        },
        update: {
          recipientStatus,
          errorDetails,
          phone: contact.waId || contact.phone,
        },
        create: {
          campaignId: campaign.id,
          contactId: contact.id,
          phone: contact.waId || contact.phone,
          recipientStatus,
          errorDetails,
        },
      });

      // If eligible, queue durable send job
      if (isEligible) {
        await prisma.campaignSendJob.create({
          data: {
            campaignId: campaign.id,
            recipientId: recipient.id,
            status: JOB_STATUS.PENDING,
            nextAttemptAt: new Date(),
          },
        });
      }
    }

    // 3. Transition campaign to RUNNING
    const updated = await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: CAMPAIGN_STATUS.RUNNING,
        startedAt: new Date(),
        totalRecipients,
        eligibleCount,
        suppressedCount,
        updatedAt: new Date(),
      },
    });

    await prisma.campaignActivityLog.create({
      data: {
        campaignId: campaign.id,
        actorId,
        action: 'STARTED',
        details: { totalRecipients, eligibleCount, suppressedCount },
      },
    });

    // If there were no eligible recipients, complete immediately
    if (eligibleCount === 0) {
      await this.checkCampaignCompletion(campaign.id);
    }

    return updated;
  }

  /**
   * Check for scheduled campaigns that have reached their target time
   */
  async checkScheduledCampaigns() {
    const dueCampaigns = await prisma.campaign.findMany({
      where: {
        status: CAMPAIGN_STATUS.SCHEDULED,
        scheduledAt: { lte: new Date() },
      },
    });

    for (const camp of dueCampaigns) {
      try {
        console.log(`[CampaignQueue] Launching scheduled campaign: ${camp.name} (${camp.id})`);
        await this.snapshotAndLaunch(camp.id, camp.createdById);
      } catch (err) {
        console.error(`[CampaignQueue] Failed to launch scheduled campaign ${camp.id}:`, err.message);
        await prisma.campaign.update({
          where: { id: camp.id },
          data: { status: CAMPAIGN_STATUS.FAILED, rejectionReason: err.message },
        });
      }
    }
  }

  /**
   * Process a single batch of pending jobs from the durable queue
   */
  async processNextBatch() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // 1. Find pending jobs ready for execution up to configured batchSize
      const jobs = await prisma.campaignSendJob.findMany({
        where: {
          status: JOB_STATUS.PENDING,
          nextAttemptAt: { lte: new Date(Date.now() + 5000) },
          campaign: { status: CAMPAIGN_STATUS.RUNNING },
        },
        take: this.batchSize,
        include: {
          campaign: {
            include: { template: true },
          },
          recipient: {
            include: { contact: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (jobs.length === 0) {
        this.isProcessing = false;
        return;
      }

      for (const job of jobs) {
        await this.processSingleJob(job);
        // Small delay between sends for rate limiting compliance
        await new Promise((r) => setTimeout(r, this.rateLimitDelayMs));
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process an individual campaign send job with fresh consent re-verification
   */
  async processSingleJob(job) {
    const { campaign, recipient } = job;

    // Check if campaign was paused or cancelled while job was queued
    const currentCampaign = await prisma.campaign.findUnique({
      where: { id: campaign.id },
      select: { status: true },
    });

    if ([CAMPAIGN_STATUS.PAUSED, CAMPAIGN_STATUS.CANCELLED, CAMPAIGN_STATUS.FAILED].includes(currentCampaign?.status)) {
      if ([CAMPAIGN_STATUS.CANCELLED, CAMPAIGN_STATUS.FAILED].includes(currentCampaign?.status)) {
        await prisma.campaignSendJob.update({
          where: { id: job.id },
          data: { status: JOB_STATUS.CANCELLED },
        });
      }
      return;
    }

    // 1. Claim job
    await prisma.campaignSendJob.update({
      where: { id: job.id },
      data: {
        status: JOB_STATUS.CLAIMED,
        lockedAt: new Date(),
        attempts: job.attempts + 1,
      },
    });

    // 2. CRITICAL PRE-SEND RE-CHECK: verify contact is STILL opted in right now
    const liveContact = await prisma.contact.findUnique({
      where: { id: recipient.contactId },
      select: { id: true, consentStatus: true, isOptedOut: true, phone: true, waId: true, firstName: true, lastName: true, company: true },
    });

    if (!liveContact || liveContact.isOptedOut || liveContact.consentStatus !== 'GRANTED') {
      console.log(`[CampaignQueue] Contact ${recipient.contactId} opted out before delivery. Suppressing send.`);
      await prisma.$transaction([
        prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            recipientStatus: RECIPIENT_STATUS.SUPPRESSED,
            errorDetails: 'Contact revoked consent or opted out prior to dispatch',
          },
        }),
        prisma.campaignSendJob.update({
          where: { id: job.id },
          data: { status: JOB_STATUS.COMPLETED },
        }),
        prisma.campaign.update({
          where: { id: campaign.id },
          data: {
            suppressedCount: { increment: 1 },
            eligibleCount: { decrement: 1 },
          },
        }),
      ]);
      await this.checkCampaignCompletion(campaign.id);
      return;
    }

    // 3. Format Template Parameters
    // e.g. mapping { "1": "firstName", "2": "company" } to actual values
    const parameters = [];
    if (campaign.parameters && typeof campaign.parameters === 'object') {
      const keys = Object.keys(campaign.parameters).sort((a, b) => Number(a) - Number(b));
      for (const k of keys) {
        const fieldName = campaign.parameters[k];
        let val = liveContact[fieldName] || fieldName;
        parameters.push({
          type: 'text',
          text: String(val || 'Valued Customer'),
        });
      }
    }

    // 4. Dispatch via WhatsApp Service
    try {
      const sendResult = await whatsappService.sendOutboundTemplate(
        {
          contactId: liveContact.id,
          templateName: campaign.template.name,
          languageCode: campaign.template.language || 'en_US',
          parameters,
          campaignId: campaign.id,
        },
        { id: campaign.createdById }
      );

      // Record successful dispatch
      await prisma.$transaction([
        prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            recipientStatus: RECIPIENT_STATUS.SENT,
            waMessageId: sendResult.waMessageId,
            messageId: sendResult.message?.id || null,
            sentAt: new Date(),
          },
        }),
        prisma.campaignSendJob.update({
          where: { id: job.id },
          data: { status: JOB_STATUS.COMPLETED },
        }),
        prisma.campaign.update({
          where: { id: campaign.id },
          data: { sentCount: { increment: 1 } },
        }),
      ]);
    } catch (err) {
      console.error(`[CampaignQueue] Failed to dispatch to recipient ${recipient.id}:`, err.message);

      const isRetryable = err.status >= 500 || err.code === 130429 || err.message?.includes('timeout');
      const maxReached = job.attempts >= job.maxAttempts;

      if (isRetryable && !maxReached) {
        // Backoff retry: 2^attempts * 2 seconds
        const delayMs = Math.pow(2, job.attempts) * 2000;
        await prisma.campaignSendJob.update({
          where: { id: job.id },
          data: {
            status: JOB_STATUS.PENDING,
            nextAttemptAt: new Date(Date.now() + delayMs),
            lastError: err.message,
          },
        });
      } else {
        // Permanent failure
        await prisma.$transaction([
          prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              recipientStatus: RECIPIENT_STATUS.FAILED,
              errorDetails: err.message,
              failedAt: new Date(),
            },
          }),
          prisma.campaignSendJob.update({
            where: { id: job.id },
            data: {
              status: JOB_STATUS.FAILED,
              lastError: err.message,
            },
          }),
          prisma.campaign.update({
            where: { id: campaign.id },
            data: { failedCount: { increment: 1 } },
          }),
        ]);
      }
    }

    // 5. Check if campaign finished all jobs
    await this.checkCampaignCompletion(campaign.id);
  }

  /**
   * Determine if all send jobs for a campaign have resolved
   */
  async checkCampaignCompletion(campaignId) {
    const remainingJobs = await prisma.campaignSendJob.count({
      where: {
        campaignId,
        status: { in: [JOB_STATUS.PENDING, JOB_STATUS.CLAIMED] },
      },
    });

    if (remainingJobs === 0) {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { status: true },
      });

      if (campaign && campaign.status === CAMPAIGN_STATUS.RUNNING) {
        await prisma.campaign.update({
          where: { id: campaignId },
          data: {
            status: CAMPAIGN_STATUS.COMPLETED,
            completedAt: new Date(),
            updatedAt: new Date(),
          },
        });
        await prisma.campaignActivityLog.create({
          data: {
            campaignId,
            action: 'COMPLETED',
            details: { completedAt: new Date() },
          },
        });
        console.log(`[CampaignQueue] Campaign ${campaignId} successfully completed.`);
      }
    }
  }

  /**
   * Pause execution of a running campaign
   */
  async pause(campaignId, actorId) {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new ApiError(404, 'Campaign not found');

    if (campaign.status !== CAMPAIGN_STATUS.RUNNING) {
      throw new ApiError(400, `Cannot pause campaign with status "${campaign.status}"`);
    }

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CAMPAIGN_STATUS.PAUSED,
        pausedAt: new Date(),
      },
    });

    await prisma.campaignActivityLog.create({
      data: {
        campaignId,
        actorId,
        action: 'PAUSED',
        details: { pausedAt: new Date() },
      },
    });

    return updated;
  }

  /**
   * Resume execution of a paused campaign
   */
  async resume(campaignId, actorId) {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new ApiError(404, 'Campaign not found');

    if (campaign.status !== CAMPAIGN_STATUS.PAUSED) {
      throw new ApiError(400, `Cannot resume campaign with status "${campaign.status}"`);
    }

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CAMPAIGN_STATUS.RUNNING,
      },
    });

    await prisma.campaignActivityLog.create({
      data: {
        campaignId,
        actorId,
        action: 'RESUMED',
        details: { resumedAt: new Date() },
      },
    });

    return updated;
  }

  /**
   * Cancel execution of a draft, scheduled, running, or paused campaign
   */
  async cancel(campaignId, actorId) {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new ApiError(404, 'Campaign not found');

    if ([CAMPAIGN_STATUS.COMPLETED, CAMPAIGN_STATUS.CANCELLED].includes(campaign.status)) {
      throw new ApiError(400, `Cannot cancel campaign with status "${campaign.status}"`);
    }

    const [updated] = await prisma.$transaction([
      prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: CAMPAIGN_STATUS.CANCELLED,
          cancelledAt: new Date(),
        },
      }),
      // Cancel unexecuted jobs
      prisma.campaignSendJob.updateMany({
        where: {
          campaignId,
          status: JOB_STATUS.PENDING,
        },
        data: { status: JOB_STATUS.CANCELLED },
      }),
      prisma.campaignRecipient.updateMany({
        where: {
          campaignId,
          recipientStatus: RECIPIENT_STATUS.QUEUED,
        },
        data: { recipientStatus: RECIPIENT_STATUS.SKIPPED, errorDetails: 'Campaign cancelled by operator' },
      }),
    ]);

    await prisma.campaignActivityLog.create({
      data: {
        campaignId,
        actorId,
        action: 'CANCELLED',
        details: { cancelledAt: new Date() },
      },
    });

    return updated;
  }
}

module.exports = new CampaignQueue();

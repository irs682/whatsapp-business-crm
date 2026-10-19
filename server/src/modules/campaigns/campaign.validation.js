const { z } = require('zod');
const { CAMPAIGN_TYPE } = require('./campaign.constants');

const createCampaignSchema = z.object({
  name: z.string().min(2, 'Campaign name must be at least 2 characters').max(100),
  description: z.string().max(500).optional().nullable(),
  type: z.nativeEnum(CAMPAIGN_TYPE).default(CAMPAIGN_TYPE.BROADCAST),
  audienceSegmentId: z.string().uuid().optional().nullable(),
  templateId: z.string().uuid().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  parameters: z.record(z.string(), z.string()).optional().nullable(),
  timezone: z.string().default('UTC'),
  scheduledAt: z.string().datetime().optional().nullable(),
});

const updateCampaignSchema = createCampaignSchema.partial();

const approveCampaignSchema = z.object({
  comment: z.string().max(500).optional().nullable(),
});

const rejectCampaignSchema = z.object({
  reason: z.string().min(3, 'Rejection reason must be at least 3 characters').max(500),
});

const scheduleCampaignSchema = z.object({
  scheduledAt: z.string().datetime().refine((val) => new Date(val) > new Date(), {
    message: 'Scheduled time must be in the future',
  }),
  timezone: z.string().default('UTC'),
});

const campaignQuerySchema = z.object({
  status: z.string().optional(),
  type: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

module.exports = {
  createCampaignSchema,
  updateCampaignSchema,
  approveCampaignSchema,
  rejectCampaignSchema,
  scheduleCampaignSchema,
  campaignQuerySchema,
};

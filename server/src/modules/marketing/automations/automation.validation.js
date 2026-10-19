const { z } = require('zod');

const createRuleSchema = z.object({
  name: z.string().min(2, 'Automation rule name must be at least 2 characters').max(100),
  description: z.string().max(500).optional().nullable(),
  triggerType: z.enum(['CONTACT_CREATED', 'LEAD_STAGE_CHANGED', 'CAMPAIGN_REPLY', 'CONSENT_REVOKED']),
  triggerConfig: z.record(z.any()).optional().nullable(),
  conditions: z.record(z.any()).optional().nullable(),
  actionType: z.enum(['CREATE_TASK', 'SEND_TEMPLATE', 'ASSIGN_DEPARTMENT', 'SUPPRESS_CONTACT']),
  actionConfig: z.record(z.any()).optional().nullable(),
  isActive: z.boolean().default(true),
});

const updateRuleSchema = createRuleSchema.partial();

module.exports = {
  createRuleSchema,
  updateRuleSchema,
};

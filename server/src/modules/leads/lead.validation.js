const { z } = require('zod');

const createLeadSchema = z.object({
  contactId: z.string().uuid('Valid contact ID is required'),
  title: z.string().min(2, 'Lead title is required').max(100),
  description: z.string().max(1000).optional().nullable(),
  value: z.number().positive().optional().nullable(),
  currency: z.string().length(3).optional().default('USD'),
  stage: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST']).optional().default('NEW'),
  pipelineStageId: z.string().uuid().optional().nullable(),
  source: z.string().max(50).optional().nullable(),
  assignedToUserId: z.string().uuid().optional().nullable(),
  ownerId: z.string().uuid().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  outcome: z.string().max(255).optional().nullable(),
});

const updateLeadSchema = z.object({
  title: z.string().min(2).max(100).optional(),
  description: z.string().max(1000).optional().nullable(),
  value: z.number().positive().optional().nullable(),
  currency: z.string().length(3).optional(),
  stage: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST']).optional(),
  pipelineStageId: z.string().uuid().optional().nullable(),
  source: z.string().max(50).optional().nullable(),
  assignedToUserId: z.string().uuid().nullable().optional(),
  ownerId: z.string().uuid().nullable().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  outcome: z.string().max(255).optional().nullable(),
});

const listLeadQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  stage: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST']).optional(),
  pipelineStageId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  assignedToUserId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
});

const createPipelineStageSchema = z.object({
  name: z.string().min(1, 'Stage name is required').max(50),
  order: z.number().int().optional().default(0),
  color: z.string().optional().default('#3b82f6'),
  isDefault: z.boolean().optional().default(false),
});

const updatePipelineStageSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  order: z.number().int().optional(),
  color: z.string().optional(),
  isDefault: z.boolean().optional(),
});

module.exports = {
  createLeadSchema,
  updateLeadSchema,
  listLeadQuerySchema,
  createPipelineStageSchema,
  updatePipelineStageSchema,
};

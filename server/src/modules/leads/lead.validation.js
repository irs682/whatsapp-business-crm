const { z } = require('zod');

const createLeadSchema = z.object({
  contactId: z.string().uuid('Valid contact ID is required'),
  title: z.string().min(2, 'Lead title is required').max(100),
  value: z.number().positive().optional(),
  currency: z.string().length(3).optional().default('USD'),
  stage: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST']).optional().default('NEW'),
  source: z.string().max(50).optional(),
  assignedToUserId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
});

const updateLeadSchema = z.object({
  title: z.string().min(2).max(100).optional(),
  value: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  stage: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST']).optional(),
  source: z.string().max(50).optional(),
  assignedToUserId: z.string().uuid().nullable().optional(),
  departmentId: z.string().uuid().nullable().optional(),
});

const listLeadQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  stage: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST']).optional(),
  contactId: z.string().uuid().optional(),
  assignedToUserId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
});

module.exports = {
  createLeadSchema,
  updateLeadSchema,
  listLeadQuerySchema,
};

const { z } = require('zod');

const createConversationSchema = z.object({
  contactId: z.string().uuid('Valid contact ID is required'),
  departmentId: z.string().uuid().optional().nullable(),
  assignedToUserId: z.string().uuid().optional().nullable(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional().default('NORMAL'),
  status: z.enum(['OPEN', 'PENDING', 'RESOLVED', 'CLOSED']).optional().default('OPEN'),
  channel: z.enum(['WHATSAPP']).optional().default('WHATSAPP'),
});

const updateStatusSchema = z.object({
  status: z.enum(['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'], {
    errorMap: () => ({ message: 'Status must be OPEN, PENDING, RESOLVED, or CLOSED' }),
  }),
});

const updatePrioritySchema = z.object({
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT'], {
    errorMap: () => ({ message: 'Priority must be LOW, NORMAL, HIGH, or URGENT' }),
  }),
});

const assignConversationSchema = z.object({
  assignedToUserId: z.string().uuid('Valid agent user ID is required').nullable(),
});

const transferConversationSchema = z.object({
  toDepartmentId: z.string().uuid('Target department ID is required'),
  reason: z.string().max(255).optional().nullable(),
  handoverSummary: z.string().max(1000).optional().nullable(),
  assignedToUserId: z.string().uuid().optional().nullable(),
});

const listConversationsQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.enum(['OPEN', 'PENDING', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  departmentId: z.string().uuid().optional(),
  assignedToUserId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  scope: z.enum(['all', 'mine', 'unassigned', 'unread', 'high_priority']).optional(),
  search: z.string().optional(),
});

module.exports = {
  createConversationSchema,
  updateStatusSchema,
  updatePrioritySchema,
  assignConversationSchema,
  transferConversationSchema,
  listConversationsQuerySchema,
};
